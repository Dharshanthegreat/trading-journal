import React, { useEffect, useMemo, useState } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { useNavigate } from 'react-router-dom';
import { accounts as accountsApi } from '../services/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Target, Award, BarChart2, Zap, Plus } from 'lucide-react';

// Classify trade entry time into London, New York, or Asian session
const getTradeSession = (t) => {
  const tags = Array.isArray(t.tags) ? t.tags : [];
  const tagsLower = tags.map(tag => tag.toLowerCase());
  if (tagsLower.some(tag => tag.includes('london'))) return 'London';
  if (tagsLower.some(tag => tag.includes('new york') || tag.includes('ny'))) return 'New York';
  if (tagsLower.some(tag => tag.includes('asia') || tag.includes('tokyo'))) return 'Asia';

  if (!t.entryTime) return 'Asia';
  try {
    const date = new Date(t.entryTime);
    const hour = date.getHours();
    if (hour >= 7 && hour < 13) return 'London';
    if (hour >= 13 && hour < 21) return 'New York';
    return 'Asia';
  } catch (e) {
    return 'Asia';
  }
};

// Calculate Risk for a trade
const getTradeRisk = (t) => {
  if (!t.stopLoss || !t.entryPrice || !t.lotSize) return 500; // default fallback risk
  const riskPerUnit = Math.abs(t.entryPrice - t.stopLoss);
  let multiplier = 1;
  const sym = (t.symbol || '').toUpperCase();
  if (sym === 'NQ') multiplier = 20;
  else if (sym === 'ES') multiplier = 50;
  else if (sym === 'YM') multiplier = 5;
  
  const risk = riskPerUnit * t.lotSize * multiplier;
  return risk > 0 ? risk : 500;
};

// Calculate R-multiple for a trade
const getTradeR = (t) => {
  const risk = getTradeRisk(t);
  return t.pnl / risk;
};

const Analytics = () => {
  const { trades, fetchTrades, analytics, fetchAnalytics, loading } = useTrades();
  const navigate = useNavigate();

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPair, setSelectedPair] = useState('All');
  const [selectedSession, setSelectedSession] = useState('All');
  const [selectedSetup, setSelectedSetup] = useState('All');
  const [selectedDirection, setSelectedDirection] = useState('All');
  const [selectedResult, setSelectedResult] = useState('All');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    fetchTrades({ limit: 1000 });
    fetchAnalytics();
    accountsApi.list().then(setAccounts).catch(console.error);
  }, [fetchTrades, fetchAnalytics]);

  const tradesList = useMemo(() => trades || [], [trades]);

  // Extract unique symbol/pair and setup list dynamically
  const uniquePairs = useMemo(() => {
    const pairs = tradesList.map(t => t.symbol?.toUpperCase()).filter(Boolean);
    return [...new Set(pairs)].sort();
  }, [tradesList]);

  const uniqueSetups = useMemo(() => {
    const setups = tradesList.map(t => t.setup).filter(Boolean);
    return [...new Set(setups)].sort();
  }, [tradesList]);

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedPair('All');
    setSelectedSession('All');
    setSelectedSetup('All');
    setSelectedDirection('All');
    setSelectedResult('All');
    setSelectedGrade('All');
  };

  // Filter trades list client-side
  const filteredTrades = useMemo(() => {
    return tradesList.filter(t => {
      // 1. Date Range
      if (startDate) {
        const entryDateStr = t.entryTime || t.entry_time;
        if (entryDateStr && entryDateStr.split('T')[0] < startDate) return false;
      }
      if (endDate) {
        const entryDateStr = t.entryTime || t.entry_time;
        if (entryDateStr && entryDateStr.split('T')[0] > endDate) return false;
      }

      // 2. Pair
      if (selectedPair !== 'All') {
        if (t.symbol?.toUpperCase() !== selectedPair.toUpperCase()) return false;
      }

      // 3. Session
      if (selectedSession !== 'All') {
        const session = getTradeSession(t);
        if (session !== selectedSession) return false;
      }

      // 4. Setup
      if (selectedSetup !== 'All') {
        if (t.setup !== selectedSetup) return false;
      }

      // 5. Direction
      if (selectedDirection !== 'All') {
        if (t.type !== selectedDirection) return false;
      }

      // 6. Result
      if (selectedResult !== 'All') {
        const acc = accounts.find(a => String(a.id) === String(t.accountId || t.account_id || 1));
        const startingBalance = acc ? (acc.startingBalance || 10000.0) : 10000.0;
        const threshold = startingBalance * 0.001;

        if (selectedResult === 'Win' && t.pnl <= threshold) return false;
        if (selectedResult === 'Loss' && t.pnl >= -threshold) return false;
        if (selectedResult === 'Breakeven' && Math.abs(t.pnl) > threshold) return false;
      }

      // 7. Grade
      if (selectedGrade !== 'All') {
        if (t.grade !== selectedGrade) return false;
      }

      return true;
    });
  }, [tradesList, startDate, endDate, selectedPair, selectedSession, selectedSetup, selectedDirection, selectedResult, selectedGrade, accounts]);

  // Compute stats on filtered trades
  const stats = useMemo(() => {
    const totalTrades = filteredTrades.length;
    if (totalTrades === 0) {
      return {
        totalTrades: 0,
        netPnL: 0,
        totalR: 0,
        winRate: 0,
        wins: 0,
        losses: 0,
        breakevens: 0,
        profitFactor: 0,
        expectancy: 0,
        avgR: 0,
        avgWin: 0,
        avgLoss: 0,
        maxDrawdown: 0,
        largestWin: 0,
        largestLoss: 0,
        streak: '0 streak',
        streakType: 'neutral',
        steelNQScore: 0,
        scoreComponents: { winRateScore: 0, pfScore: 0, wlrScore: 0, rfScore: 0, ddScore: 0, consistencyScore: 0 }
      };
    }

    const getResult = (t) => {
      const acc = accounts.find(a => String(a.id) === String(t.accountId || t.account_id || 1));
      const startingBalance = acc ? (acc.startingBalance || 10000.0) : 10000.0;
      const threshold = startingBalance * 0.001;
      if (t.pnl > threshold) return 'Win';
      if (t.pnl < -threshold) return 'Loss';
      return 'Breakeven';
    };

    const wins = filteredTrades.filter(t => getResult(t) === 'Win');
    const losses = filteredTrades.filter(t => getResult(t) === 'Loss');
    const breakevens = filteredTrades.filter(t => getResult(t) === 'Breakeven');

    const netPnL = parseFloat(filteredTrades.reduce((acc, t) => acc + (t.pnl || 0), 0).toFixed(2));
    const totalWin = wins.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const totalLoss = Math.abs(losses.reduce((acc, t) => acc + (t.pnl || 0), 0));

    const winRate = parseFloat(((wins.length / totalTrades) * 100).toFixed(1));
    const profitFactor = totalLoss > 0 ? parseFloat((totalWin / totalLoss).toFixed(2)) : (wins.length > 0 ? 99.9 : 0);
    const expectancy = parseFloat((netPnL / totalTrades).toFixed(2));

    // R-multiple calculations
    const rMultiples = filteredTrades.map(getTradeR);
    const totalR = parseFloat(rMultiples.reduce((acc, r) => acc + r, 0).toFixed(2));
    const avgR = parseFloat((totalR / totalTrades).toFixed(2));

    const avgWin = wins.length > 0 ? parseFloat((totalWin / wins.length).toFixed(2)) : 0;
    const avgLoss = losses.length > 0 ? parseFloat((totalLoss / losses.length).toFixed(2)) : 0;

    const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0;
    const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0;

    // Drawdowns
    const chronoTrades = [...filteredTrades].sort((a, b) => new Date(a.entryTime || a.entry_time) - new Date(b.entryTime || b.entry_time));
    let running = 0, peak = 0, maxDrawdown = 0;
    chronoTrades.forEach(t => {
      running += t.pnl || 0;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });
    maxDrawdown = parseFloat(maxDrawdown.toFixed(2));

    // Current Streak
    let currentStreak = 0;
    let isWinningStreak = null;
    if (chronoTrades.length > 0) {
      const lastTrade = chronoTrades[chronoTrades.length - 1];
      isWinningStreak = getResult(lastTrade) === 'Win';
      for (let i = chronoTrades.length - 1; i >= 0; i--) {
        const tradeResult = getResult(chronoTrades[i]);
        if (isWinningStreak && tradeResult === 'Win') {
          currentStreak++;
        } else if (!isWinningStreak && tradeResult === 'Loss') {
          currentStreak++;
        } else if (tradeResult !== 'Breakeven') {
          break;
        }
      }
    }
    const streak = currentStreak > 0 ? `${currentStreak}${isWinningStreak ? 'W' : 'L'} streak` : '0 streak';
    const streakType = currentStreak > 0 ? (isWinningStreak ? 'profit' : 'loss') : 'neutral';

    // Max Loss Streak for Consistency
    let maxLossStreak = 0;
    let tempLossStreak = 0;
    chronoTrades.forEach(t => {
      const res = getResult(t);
      if (res === 'Loss') {
        tempLossStreak++;
        if (tempLossStreak > maxLossStreak) maxLossStreak = tempLossStreak;
      } else if (res === 'Win') {
        tempLossStreak = 0;
      }
    });

    // Score calculations
    const winRateScore = Math.round(winRate);
    const pfScore = Math.round(Math.min(100, (profitFactor / 3.0) * 100));
    const wlr = avgLoss > 0 ? (avgWin / avgLoss) : (avgWin > 0 ? 3.0 : 1.0);
    const wlrScore = Math.round(Math.min(100, (wlr / 3.0) * 100));
    const recoveryFactor = maxDrawdown > 0 ? (netPnL / maxDrawdown) : (netPnL > 0 ? 3.0 : 0);
    const rfScore = Math.round(Math.min(100, Math.max(0, (recoveryFactor / 3.0) * 100)));
    const ddRatio = netPnL > 0 ? (maxDrawdown / netPnL) : 1;
    const ddScore = Math.round(Math.max(0, Math.min(100, 100 - ddRatio * 75)));
    const consistencyScore = Math.round(Math.max(20, 100 - (maxLossStreak * 12)));

    const steelNQScore = Math.round((winRateScore + pfScore + wlrScore + rfScore + ddScore + consistencyScore) / 6);

    return {
      totalTrades,
      netPnL,
      totalR,
      winRate,
      wins: wins.length,
      losses: losses.length,
      breakevens: breakevens.length,
      profitFactor,
      expectancy,
      avgR,
      avgWin,
      avgLoss,
      maxDrawdown,
      largestWin,
      largestLoss,
      streak,
      streakType,
      steelNQScore,
      scoreComponents: {
        winRateScore,
        pfScore,
        wlrScore,
        rfScore,
        ddScore,
        consistencyScore
      }
    };
  }, [filteredTrades, accounts]);

  // Equity growth curve dataset starting from $50,000
  const equityCurveData = useMemo(() => {
    const chronoTrades = [...filteredTrades].sort((a, b) => new Date(a.entryTime || a.entry_time) - new Date(b.entryTime || b.entry_time));
    let running = 0;
    const startBalance = 50000;
    
    const data = [{
      date: 'Start',
      equity: startBalance,
      pnl: 0,
      symbol: 'Start'
    }];

    chronoTrades.forEach((t, idx) => {
      running += t.pnl || 0;
      data.push({
        index: idx + 1,
        date: t.entryTime ? format(new Date(t.entryTime), 'MMM d, yy') : '',
        equity: parseFloat((startBalance + running).toFixed(2)),
        pnl: t.pnl,
        symbol: t.symbol
      });
    });

    return data;
  }, [filteredTrades]);

  // Custom Equity Tooltip
  const EquityTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    if (p.date === 'Start') {
      return (
        <div className="glass" style={{ padding: '8px 12px', fontSize: '0.75rem', border: '1px solid var(--border-strong)', background: 'var(--bg-elevated)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: 2 }}>Starting Point</div>
          <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)' }}>
            $50,000.00
          </div>
        </div>
      );
    }
    return (
      <div className="glass" style={{ padding: '8px 12px', fontSize: '0.75rem', border: '1px solid var(--border-strong)', background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{p.date}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{p.symbol}</span>
          <span style={{ color: p.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 700 }}>
            {p.pnl >= 0 ? '+' : ''}${p.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '4px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem' }}>Account Equity:</span>
          <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>
            ${p.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    );
  };

  if (loading && tradesList.length === 0) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s5)' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="glass skeleton" style={{ height: 300, borderRadius: 'var(--r-lg)' }}/>
        ))}
      </div>
    );
  }

  if (tradesList.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="page-title"><BarChart2 size={18} style={{ opacity: 0.6, marginRight: 8 }}/> Analytics</div>
            <div className="page-subtitle">What actually makes you money</div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/journal')}>
            <Plus size={14}/> New Trade
          </button>
        </div>
        <div className="glass empty-state" style={{ padding: 'var(--s12)' }}>
          <BarChart2 size={32} style={{ opacity: 0.3 }}/>
          <div className="empty-title">No data to analyze</div>
          <div className="empty-desc">Log your first trade in the Journal to see analytics</div>
        </div>
      </div>
    );
  }

  const { scoreComponents } = stats;

  const factors = [
    { label: 'Win rate', val: scoreComponents.winRateScore },
    { label: 'Profit factor', val: scoreComponents.pfScore },
    { label: 'Win/Loss ratio', val: scoreComponents.wlrScore },
    { label: 'Recovery factor', val: scoreComponents.rfScore },
    { label: 'Drawdown control', val: scoreComponents.ddScore },
    { label: 'Consistency', val: scoreComponents.consistencyScore },
  ];

  const axisProps = {
    stroke: 'transparent',
    tick: { fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'Inter' },
    tickLine: false,
    axisLine: false,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800 }}>Analytics</h1>
          <p className="page-subtitle" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>What actually makes you money</p>
        </div>
        <button 
          className="btn" 
          onClick={() => navigate('/journal')} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            background: '#00f0ff',
            color: '#0a0b0f',
            borderColor: '#00f0ff',
            fontWeight: 700,
            borderRadius: 'var(--r-md)',
            padding: '8px 16px',
            fontSize: '0.78rem'
          }}
        >
          <Plus size={14} /> New Trade
        </button>
      </div>

      {/* Filters Row */}
      <div className="glass" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
        <input 
          type="date" 
          className="input" 
          style={{ width: 'auto', flex: '1 1 130px', fontSize: '0.78rem', height: '36px', minWidth: '130px' }} 
          value={startDate} 
          onChange={e => setStartDate(e.target.value)} 
          placeholder="dd/mm/yyyy"
        />
        <input 
          type="date" 
          className="input" 
          style={{ width: 'auto', flex: '1 1 130px', fontSize: '0.78rem', height: '36px', minWidth: '130px' }} 
          value={endDate} 
          onChange={e => setEndDate(e.target.value)} 
          placeholder="dd/mm/yyyy"
        />
        
        <select className="input" style={{ width: 'auto', flex: '1 1 120px', fontSize: '0.78rem', height: '36px', cursor: 'pointer' }} value={selectedPair} onChange={e => setSelectedPair(e.target.value)}>
          <option value="All">Pair: All</option>
          {uniquePairs.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select className="input" style={{ width: 'auto', flex: '1 1 120px', fontSize: '0.78rem', height: '36px', cursor: 'pointer' }} value={selectedSession} onChange={e => setSelectedSession(e.target.value)}>
          <option value="All">Session: All</option>
          <option value="London">London</option>
          <option value="New York">New York</option>
          <option value="Asia">Asia</option>
        </select>

        <select className="input" style={{ width: 'auto', flex: '1 1 120px', fontSize: '0.78rem', height: '36px', cursor: 'pointer' }} value={selectedSetup} onChange={e => setSelectedSetup(e.target.value)}>
          <option value="All">Setup: All</option>
          {uniqueSetups.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select className="input" style={{ width: 'auto', flex: '1 1 120px', fontSize: '0.78rem', height: '36px', cursor: 'pointer' }} value={selectedDirection} onChange={e => setSelectedDirection(e.target.value)}>
          <option value="All">Direction: All</option>
          <option value="Long">Long</option>
          <option value="Short">Short</option>
        </select>

        <select className="input" style={{ width: 'auto', flex: '1 1 120px', fontSize: '0.78rem', height: '36px', cursor: 'pointer' }} value={selectedResult} onChange={e => setSelectedResult(e.target.value)}>
          <option value="All">Result: All</option>
          <option value="Win">Win</option>
          <option value="Loss">Loss</option>
          <option value="Breakeven">Breakeven</option>
        </select>

        <select className="input" style={{ width: 'auto', flex: '1 1 120px', fontSize: '0.78rem', height: '36px', cursor: 'pointer' }} value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}>
          <option value="All">Grade: All</option>
          {['A+', 'A', 'B', 'C', 'D', 'F'].map(g => <option key={g} value={g}>{g}</option>)}
        </select>

        <button className="btn btn-ghost" style={{ height: '36px', padding: '0 16px', fontSize: '0.78rem' }} onClick={handleClearFilters}>
          Clear
        </button>
      </div>

      {/* Top Cards: SteelNQ Score & Win Rate */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--s4)' }}>
        {/* SteelNQ Score Card */}
        <div className="glass" style={{ padding: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>SteelNQ Score</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>A single 0-100 read on the quality of your trading, from six factors</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--s5)', flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
            {/* Circular Gauge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '120px', position: 'relative', margin: '0 auto' }}>
              <svg width="110" height="110" viewBox="0 0 110 110">
                <defs>
                  <linearGradient id="cyanScoreGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#00f0ff" />
                    <stop offset="100%" stopColor="#00a2ff" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <circle cx="55" cy="55" r="42" fill="none" stroke="var(--border-strong)" strokeWidth="8" />
                <circle
                  cx="55"
                  cy="55"
                  r="42"
                  fill="none"
                  stroke="url(#cyanScoreGrad)"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={2 * Math.PI * 42 * (1 - (stats.steelNQScore || 0) / 100)}
                  strokeLinecap="round"
                  transform="rotate(-90 55 55)"
                  filter="url(#glow)"
                  style={{ transition: 'stroke-dashoffset var(--t-slow)' }}
                />
              </svg>
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono', lineHeight: 1 }}>{stats.steelNQScore}</span>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: stats.steelNQScore >= 70 ? 'var(--profit)' : (stats.steelNQScore >= 50 ? 'var(--warn)' : 'var(--loss)'), textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>
                  {stats.steelNQScore >= 80 ? 'Superb' : (stats.steelNQScore >= 70 ? 'Strong' : (stats.steelNQScore >= 50 ? 'Average' : (stats.steelNQScore >= 35 ? 'Weak' : 'Poor')))}
                </span>
              </div>
            </div>
            
            {/* Horizontal Factors Progress */}
            <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {factors.map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', width: '100px', minWidth: '100px' }}>{f.label}</span>
                  <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${f.val}%`,
                      background: 'linear-gradient(90deg, #00d2ff 0%, #0072ff 100%)',
                      borderRadius: '3px',
                      transition: 'width var(--t-slow)'
                    }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, width: '28px', textAlign: 'right', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{f.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Win Rate Card */}
        <div className="glass" style={{ padding: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Win Rate</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Wins - breakeven - losses</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
            <div>
              <span style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--text-primary)', lineHeight: 1 }}>{stats.winRate.toFixed(1)}%</span>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>win rate</p>
            </div>
            {/* Stacked Progress Bar */}
            <div style={{ display: 'flex', height: '10px', background: 'var(--border-strong)', borderRadius: '5px', overflow: 'hidden', margin: '16px 0 12px 0' }}>
              <div style={{ width: `${(stats.wins / (stats.totalTrades || 1)) * 100}%`, background: 'var(--profit)', transition: 'width var(--t-slow)' }} />
              <div style={{ width: `${(stats.breakevens / (stats.totalTrades || 1)) * 100}%`, background: 'var(--warn)', transition: 'width var(--t-slow)' }} />
              <div style={{ width: `${(stats.losses / (stats.totalTrades || 1)) * 100}%`, background: 'var(--loss)', transition: 'width var(--t-slow)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
              <span style={{ color: 'var(--profit)' }}>{stats.wins} wins</span>
              <span style={{ color: 'var(--warn)' }}>{stats.breakevens} BE</span>
              <span style={{ color: 'var(--loss)' }}>{stats.losses} losses</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Row 1: 7 cards */}
        <div className="analytics-kpi-row-1">
          {[
            { label: 'NET PNL', val: `${stats.netPnL >= 0 ? '+' : ''}$${stats.netPnL.toLocaleString()}`, col: stats.netPnL >= 0 ? 'var(--profit)' : 'var(--loss)', labelColor: 'var(--text-tertiary)' },
            { label: 'TOTAL R', val: `${stats.totalR >= 0 ? '+' : ''}${stats.totalR}R`, col: stats.totalR >= 0 ? 'var(--profit)' : 'var(--loss)', labelColor: 'var(--text-tertiary)' },
            { label: 'WIN RATE', val: `${stats.winRate.toFixed(1)}%`, sub: `${stats.wins}W - ${stats.losses}L - ${stats.breakevens}BE`, col: 'var(--text-primary)', subCol: 'var(--text-muted)' },
            { label: 'PROFIT FACTOR', val: stats.profitFactor === 99.9 ? '∞' : stats.profitFactor.toFixed(2), col: 'var(--text-primary)' },
            { label: 'EXPECTANCY', val: `${stats.expectancy >= 0 ? '+' : ''}$${stats.expectancy.toFixed(2)}`, sub: 'per trade', col: stats.expectancy >= 0 ? 'var(--profit)' : 'var(--loss)', subCol: 'var(--text-muted)' },
            { label: 'AVG R', val: `${stats.avgR >= 0 ? '+' : ''}${stats.avgR}R`, col: stats.avgR >= 0 ? 'var(--profit)' : 'var(--loss)' },
            { label: 'AVG WIN', val: `$${stats.avgWin.toLocaleString()}`, col: 'var(--profit)' }
          ].map((k, i) => (
            <div key={i} className="glass stat-card" style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.04em', color: k.labelColor || 'var(--text-tertiary)' }}>{k.label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: k.col, fontFamily: 'JetBrains Mono', wordBreak: 'break-word', lineHeight: 1.2 }}>{k.val}</div>
              {k.sub && <div style={{ fontSize: '0.62rem', color: k.subCol || 'var(--text-muted)', fontWeight: 500 }}>{k.sub}</div>}
            </div>
          ))}
        </div>

        {/* Row 2: 5 cards */}
        <div className="analytics-kpi-row-2">
          {[
            { label: 'AVG LOSS', val: stats.avgLoss > 0 ? `-$${stats.avgLoss.toLocaleString()}` : '$0.00', col: 'var(--loss)' },
            { label: 'MAX DRAWDOWN', val: stats.maxDrawdown > 0 ? `-$${stats.maxDrawdown.toLocaleString()}` : '$0.00', col: 'var(--loss)' },
            { label: 'LARGEST WIN', val: `$${stats.largestWin.toLocaleString()}`, col: 'var(--profit)' },
            { label: 'LARGEST LOSS', val: stats.largestLoss < 0 ? `-$${Math.abs(stats.largestLoss).toLocaleString()}` : '$0.00', col: 'var(--loss)' },
            { label: 'TRADES', val: stats.totalTrades, sub: stats.streak, subCol: stats.streakType === 'profit' ? 'var(--profit)' : (stats.streakType === 'loss' ? 'var(--loss)' : 'var(--text-muted)') }
          ].map((k, i) => (
            <div key={i} className="glass stat-card" style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.04em', color: k.labelColor || 'var(--text-tertiary)' }}>{k.label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: k.col, fontFamily: 'JetBrains Mono', wordBreak: 'break-word', lineHeight: 1.2 }}>{k.val}</div>
              {k.sub && <div style={{ fontSize: '0.62rem', color: k.subCol || 'var(--text-muted)', fontWeight: 500 }}>{k.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Account Equity Growth Curve */}
      <div className="glass" style={{ padding: 'var(--s4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: 'var(--s4)' }}>
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Account Equity</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '12px' }}>Balance growth from a $50,000 starting point (filtered trades)</p>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
              ${(50000 + stats.netPnL).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end', minHeight: '65px' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--profit)', fontFamily: 'JetBrains Mono' }}>
              ${(50000 + stats.netPnL).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
        
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityCurveData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--profit)" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="var(--profit)" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" {...axisProps} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <YAxis 
                {...axisProps} 
                domain={['auto', 'auto']}
                tickFormatter={(val) => `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
              />
              <ReferenceLine y={50000} stroke="var(--border-strong)" strokeDasharray="3 3" />
              <Tooltip content={<EquityTooltip />} />
              <Area 
                type="monotone" 
                dataKey="equity" 
                stroke="var(--profit)" 
                strokeWidth={2} 
                fill="url(#eqGradient)" 
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
