import React, { useEffect, useMemo, useState } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { accounts as accountsApi } from '../services/api';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, BarChart, Bar, ReferenceLine,
  AreaChart, Area
} from 'recharts';
import { format } from 'date-fns';
import { Brain, Zap, Activity, ArrowRight, TrendingUp, TrendingDown, Target, Plus } from 'lucide-react';

const EMOTION_COLORS = {
  Calm: '#818cf8', Confident: '#34d399', Anxious: '#fbbf24',
  Fearful: '#fca5a5', Greedy: '#f97316', FOMO: '#f87171',
  Disciplined: '#60a5fa', Revenge: '#ef4444',
};

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

const Emotions = () => {
  const { trades, fetchTrades, loading } = useTrades();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPair, setSelectedPair] = useState('All');
  const [selectedSession, setSelectedSession] = useState('All');
  const [selectedSetup, setSelectedSetup] = useState('All');
  const [selectedDirection, setSelectedDirection] = useState('All');
  const [selectedResult, setSelectedResult] = useState('All');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [selectedAccount, setSelectedAccount] = useState('All');
  const [accounts, setAccounts] = useState([]);

  // Fetch accounts list (only if not guest user)
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        if (!user?.isGuest) {
          const data = await accountsApi.list();
          setAccounts(data || []);
        }
      } catch (err) {
        console.error('Failed to fetch accounts in psychology:', err);
      }
    };
    fetchTrades({ limit: 1000 });
    fetchAccounts();
  }, [user, fetchTrades]);

  // Compute accounts list dynamically (combining live and guest mock accounts)
  const accountsList = useMemo(() => {
    if (user?.isGuest) {
      const accIds = [...new Set((trades || []).map(t => t.accountId || t.account_id || 1))];
      return accIds.map(id => {
        if (String(id) === '1') {
          return { id: 1, accountName: '25K Funded Futures Family', startingBalance: 25000.0 };
        }
        if (String(id) === '2') {
          return { id: 2, accountName: '50K Apex Challenge Passed', startingBalance: 50000.0 };
        }
        if (String(id) === '3') {
          return { id: 3, accountName: '10K MyForexFunds Failed', startingBalance: 10000.0 };
        }
        return { id, accountName: `Account ${id}`, startingBalance: 25000.0 };
      });
    }
    return accounts;
  }, [user, trades, accounts]);

  const tradesList = useMemo(() => {
    return (trades || []).filter(t => !t.tags?.includes('Monday-Only'));
  }, [trades]);

  const startBalance = useMemo(() => {
    if (selectedAccount === 'All') {
      if (accountsList.length > 0) {
        return accountsList.reduce((acc, curr) => acc + (parseFloat(curr.startingBalance) || 0), 0);
      }
      return user?.accountSize ? parseFloat(user.accountSize) : 25000;
    } else {
      const acc = accountsList.find(a => String(a.id) === String(selectedAccount));
      return acc ? (parseFloat(acc.startingBalance) || 0) : (user?.accountSize ? parseFloat(user.accountSize) : 25000);
    }
  }, [selectedAccount, accountsList, user]);

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
    setSelectedAccount('All');
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

      // 1.5. Account
      if (selectedAccount !== 'All') {
        const accId = t.accountId || t.account_id || 1;
        if (String(accId) !== String(selectedAccount)) return false;
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
        if (selectedResult === 'Win' && t.pnl <= 0) return false;
        if (selectedResult === 'Loss' && t.pnl >= 0) return false;
        if (selectedResult === 'Breakeven' && t.pnl !== 0) return false;
      }

      // 7. Grade
      if (selectedGrade !== 'All') {
        if (t.grade !== selectedGrade) return false;
      }

      return true;
    });
  }, [tradesList, startDate, endDate, selectedPair, selectedSession, selectedSetup, selectedDirection, selectedResult, selectedGrade, selectedAccount]);

  const analytics = useMemo(() => {
    if (!filteredTrades.length) return null;

    const scatterData = filteredTrades.map(t => {
      const f = parseFloat(t.fomoLevel);
      const c = parseFloat(t.confidenceLevel);
      const p = parseFloat(t.pnl);
      return {
        fomo: isNaN(f) ? 5 : f,
        confidence: isNaN(c) ? 5 : c,
        pnl: isNaN(p) ? 0 : p,
        symbol: t.symbol || '',
        date: t.entryTime ? new Date(t.entryTime).toLocaleDateString() : '',
      };
    });

    const fomoGroups = { 'Low (1-3)': [], 'Med (4-7)': [], 'High (8-10)': [] };
    const confGroups = { 'Low (1-3)': [], 'Med (4-7)': [], 'High (8-10)': [] };

    filteredTrades.forEach(t => {
      const pnl = parseFloat(t.pnl) || 0;
      const fomoVal = parseFloat(t.fomoLevel);
      const confVal = parseFloat(t.confidenceLevel);
      const fomo = isNaN(fomoVal) ? 5 : fomoVal;
      const conf = isNaN(confVal) ? 5 : confVal;
      if (fomo <= 3) fomoGroups['Low (1-3)'].push(pnl);
      else if (fomo <= 7) fomoGroups['Med (4-7)'].push(pnl);
      else fomoGroups['High (8-10)'].push(pnl);
      
      if (conf <= 3) confGroups['Low (1-3)'].push(pnl);
      else if (conf <= 7) confGroups['Med (4-7)'].push(pnl);
      else confGroups['High (8-10)'].push(pnl);
    });

    const avg = arr => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : 0;
    const fomoBar = Object.entries(fomoGroups).map(([k, v]) => ({ name: k, avgPnl: avg(v), count: v.length }));
    const confBar = Object.entries(confGroups).map(([k, v]) => ({ name: k, avgPnl: avg(v), count: v.length }));

    const tagMap = {};
    filteredTrades.forEach(t => {
      (t.emotionTags || []).forEach(tag => { tagMap[tag] = (tagMap[tag] || 0) + 1; });
    });
    const topTags = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

    const wins = filteredTrades.filter(t => (parseFloat(t.pnl) || 0) > 0);
    const losses = filteredTrades.filter(t => (parseFloat(t.pnl) || 0) < 0);

    const winConf = wins.map(t => {
      const c = parseFloat(t.confidenceLevel);
      return isNaN(c) ? 5 : c;
    });
    const lossConf = losses.map(t => {
      const c = parseFloat(t.confidenceLevel);
      return isNaN(c) ? 5 : c;
    });
    const avgFomo = +(filteredTrades.reduce((a, t) => {
      const f = parseFloat(t.fomoLevel);
      return a + (isNaN(f) ? 5 : f);
    }, 0) / filteredTrades.length).toFixed(1);
    const avgConf = +(filteredTrades.reduce((a, t) => {
      const c = parseFloat(t.confidenceLevel);
      return a + (isNaN(c) ? 5 : c);
    }, 0) / filteredTrades.length).toFixed(1);

    // Compute Discipline Index Score (Discipline = Avg of (10 - fomo)/9 + (conf - 1)/9 per trade)
    let totalScore = 0;
    filteredTrades.forEach(t => {
      const fomoVal = parseFloat(t.fomoLevel);
      const confVal = parseFloat(t.confidenceLevel);
      const f = isNaN(fomoVal) ? 5 : fomoVal;
      const c = isNaN(confVal) ? 5 : confVal;
      const fomoScore = (10 - f) / 9;
      const confidenceScore = (c - 1) / 9;
      totalScore += (fomoScore + confidenceScore) / 2 * 100;
    });
    const disciplineScore = Math.round(totalScore / filteredTrades.length);

    // Revenge trades count
    const revengeCount = filteredTrades.filter(t => (t.emotionTags || []).includes('Revenge')).length;

    // FOMO losses cost (FOMO >= 7)
    const fomoCost = parseFloat(filteredTrades.filter(t => {
      const f = parseFloat(t.fomoLevel);
      return (isNaN(f) ? 5 : f) >= 7;
    }).reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0).toFixed(2));

    // Disciplined P&L impact (FOMO <= 3, Confidence >= 7)
    const disciplinedPnL = parseFloat(filteredTrades.filter(t => {
      const f = parseFloat(t.fomoLevel);
      const c = parseFloat(t.confidenceLevel);
      return (isNaN(f) ? 5 : f) <= 3 && (isNaN(c) ? 5 : c) >= 7;
    }).reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0).toFixed(2));

    return {
      scatterData, fomoBar, confBar, topTags,
      avgWinConf: avg(winConf), avgLossConf: avg(lossConf),
      avgFomo, avgConf, disciplineScore, revengeCount, fomoCost, disciplinedPnL
    };
  }, [filteredTrades]);

  // Equity curve data for psychology page
  const equityCurveData = useMemo(() => {
    const chronoTrades = [...filteredTrades].sort((a, b) => {
      const timeA = a.entryTime ? new Date(a.entryTime).getTime() : (a.entry_time ? new Date(a.entry_time).getTime() : 0);
      const timeB = b.entryTime ? new Date(b.entryTime).getTime() : (b.entry_time ? new Date(b.entry_time).getTime() : 0);
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || 0) - (b.id || 0);
    });
    let running = 0;
    let peak = startBalance;
    
    const data = [{
      date: 'Start',
      equity: startBalance,
      baseline: startBalance,
      pnl: 0,
      symbol: 'Start',
      drawdownPct: 0
    }];

    chronoTrades.forEach((t, idx) => {
      running += t.pnl || 0;
      const currentEquity = parseFloat((startBalance + running).toFixed(2));
      if (currentEquity > peak) peak = currentEquity;
      const drawdownPct = peak > 0 ? parseFloat((((peak - currentEquity) / peak) * 100).toFixed(2)) : 0;
      data.push({
        index: idx + 1,
        date: t.entryTime ? format(new Date(t.entryTime), 'MMM d, yy') : '',
        equity: currentEquity,
        baseline: startBalance,
        pnl: t.pnl,
        symbol: t.symbol,
        drawdownPct
      });
    });

    return data;
  }, [filteredTrades, startBalance]);

  const netPnL = useMemo(() => {
    return parseFloat(filteredTrades.reduce((acc, t) => acc + (t.pnl || 0), 0).toFixed(2));
  }, [filteredTrades]);

  // Equity curve color logic — adapts to P&L state
  const eqCurveColor = netPnL >= 0 ? 'var(--profit)' : 'var(--loss)';
  const eqCurveColorDim = netPnL >= 0 ? 'var(--profit)' : 'var(--loss)';

  // Max drawdown for badges
  const maxDrawdown = useMemo(() => {
    const chronoTrades = [...filteredTrades].sort((a, b) => new Date(a.entryTime || a.entry_time) - new Date(b.entryTime || b.entry_time));
    let running = 0, peak = 0, maxDD = 0;
    chronoTrades.forEach(t => {
      running += t.pnl || 0;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDD) maxDD = dd;
    });
    return parseFloat(maxDD.toFixed(2));
  }, [filteredTrades]);

  // High/low equity markers
  const equityExtremes = useMemo(() => {
    if (equityCurveData.length <= 1) return { high: startBalance, low: startBalance, highDate: '', lowDate: '' };
    const dataOnly = equityCurveData.slice(1);
    let high = -Infinity, low = Infinity, highDate = '', lowDate = '';
    dataOnly.forEach(d => {
      if (d.equity > high) { high = d.equity; highDate = d.date; }
      if (d.equity < low) { low = d.equity; lowDate = d.date; }
    });
    return { high, low, highDate, lowDate };
  }, [equityCurveData, startBalance]);

  // Custom Equity Tooltip
  const EquityTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    if (p.date === 'Start') {
      return (
        <div className="glass" style={{ padding: '8px 12px', fontSize: '0.75rem', border: '1px solid var(--border-strong)', background: 'var(--bg-elevated)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: 2 }}>Starting Point</div>
          <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)' }}>
            ${startBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

  const axisProps = {
    stroke: 'transparent',
    tick: { fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'Inter' },
    tickLine: false, axisLine: false,
  };

  const BarTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass" style={{ padding: '8px 12px', fontSize: '0.72rem', border: '1px solid var(--border-strong)', background: 'var(--bg-elevated)' }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontSize: '0.62rem' }}>{label}</div>
        <div style={{ color: payload[0].value >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
          Avg P&L: {payload[0].value >= 0 ? '+' : ''}${payload[0].value}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>{payload[0].payload.count} trades</div>
      </div>
    );
  };

  const ScatterTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div className="glass" style={{ padding: '8px 12px', fontSize: '0.72rem', border: '1px solid var(--border-strong)', background: 'var(--bg-elevated)' }}>
        <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>{d.symbol} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{d.date}</span></div>
        <div style={{ color: 'var(--text-tertiary)' }}>FOMO: {d.fomo}/10</div>
        <div style={{ color: 'var(--text-tertiary)' }}>Confidence: {d.confidence}/10</div>
        <div style={{ color: d.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
          P&L: {d.pnl >= 0 ? '+' : ''}${d.pnl}
        </div>
      </div>
    );
  };

  if (loading && tradesList.length === 0) return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s5)' }}>
      {[...Array(4)].map((_, i) => (<div key={i} className="glass skeleton" style={{ height: 280, borderRadius: 'var(--r-lg)' }}/>))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800 }}>Psychology</h1>
          <p className="page-subtitle" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Understand how your mindset affects performance</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => navigate('/journal')} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            background: 'var(--accent)',
            borderColor: 'var(--accent)',
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
        
        <select className="input" style={{ width: 'auto', flex: '1 1 120px', fontSize: '0.78rem', height: '36px', cursor: 'pointer' }} value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
          <option value="All">Account: All accounts</option>
          {accountsList.map(acc => <option key={acc.id} value={acc.id}>{acc.accountName}</option>)}
        </select>

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

      {!analytics ? (
        <div className="glass empty-state" style={{ padding: 'var(--s12)' }}>
          <Brain size={32} style={{ opacity: 0.3 }}/>
          <div className="empty-title">No psychology data yet</div>
          <div className="empty-desc">Log trades with emotion tags, FOMO, and Confidence ratings to unlock analysis.</div>
        </div>
      ) : (
        <>
          {/* Circular Discipline Gauge Card */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--s4)' }}>
            <div className="glass" style={{ padding: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Discipline Index</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>A 0-100 gauge reflecting emotional management based on FOMO & confidence</p>
              </div>
              <div style={{ display: 'flex', gap: 'var(--s5)', flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '120px', position: 'relative', margin: '0 auto' }}>
                  <svg width="110" height="110" viewBox="0 0 110 110">
                    <defs>
                      <linearGradient id="purpleMindsetGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#a78bfa" />
                        <stop offset="100%" stopColor="#818cf8" />
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
                      stroke="url(#purpleMindsetGrad)"
                      strokeWidth="8"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={2 * Math.PI * 42 * (1 - (analytics.disciplineScore || 0) / 100)}
                      strokeLinecap="round"
                      transform="rotate(-90 55 55)"
                      filter="url(#glow)"
                      style={{ transition: 'stroke-dashoffset var(--t-slow)' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono', lineHeight: 1 }}>{analytics.disciplineScore}</span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: analytics.disciplineScore >= 80 ? 'var(--profit)' : (analytics.disciplineScore >= 65 ? 'var(--accent)' : (analytics.disciplineScore >= 45 ? 'var(--warn)' : 'var(--loss)')), textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>
                      {analytics.disciplineScore >= 80 ? 'Disciplined' : (analytics.disciplineScore >= 65 ? 'Balanced' : (analytics.disciplineScore >= 45 ? 'Impulsive' : 'High Risk'))}
                    </span>
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* FOMO Level Indicator */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>FOMO Resistance</span>
                      <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{(10 - analytics.avgFomo).toFixed(1)}/10</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(10 - analytics.avgFomo) * 10}%`,
                        background: analytics.avgFomo <= 4 ? 'var(--profit)' : (analytics.avgFomo <= 7 ? 'var(--warn)' : 'var(--loss)'),
                        borderRadius: '3px',
                        transition: 'width var(--t-slow)'
                      }} />
                    </div>
                  </div>

                  {/* Confidence Level Indicator */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Average Confidence</span>
                      <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{analytics.avgConf.toFixed(1)}/10</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${analytics.avgConf * 10}%`,
                        background: 'linear-gradient(90deg, #818cf8 0%, #34d399 100%)',
                        borderRadius: '3px',
                        transition: 'width var(--t-slow)'
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* General Mindset Notes */}
            <div className="glass" style={{ padding: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Mindset Profile</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Key takeaways based on your emotional logging</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', justifyContent: 'center', flex: 1, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>🧘</span>
                  <span>
                    {analytics.disciplineScore >= 80 
                      ? 'Excellent risk control. Your executions are aligned with low FOMO and optimal confidence levels.' 
                      : (analytics.disciplineScore >= 65 
                        ? 'Good balance. However, minor emotional friction exists. Monitor setups that trigger FOMO.'
                        : 'Significant emotional slippage. You are likely chasing trades or executing out of boredom.')}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>📊</span>
                  <span>
                    {analytics.fomoCost < 0 
                      ? `Chasing setups has cost you a net total of ` 
                      : `Chasing setups has contributed a positive `}
                    <strong style={{ color: analytics.fomoCost >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                      {analytics.fomoCost >= 0 ? '+' : ''}${analytics.fomoCost.toLocaleString()}
                    </strong>. Keep FOMO levels low to avoid capital leaks.
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>🔥</span>
                  <span>
                    Disciplined trades (FOMO &le; 3, Conf &ge; 7) generated{' '}
                    <strong style={{ color: analytics.disciplinedPnL >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                      {analytics.disciplinedPnL >= 0 ? '+' : ''}${analytics.disciplinedPnL.toLocaleString()}
                    </strong>. Focus on standardizing this execution model.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Over Time — Equity Growth Curve */}
          <div className="glass" style={{ padding: 'var(--s5)', position: 'relative', overflow: 'hidden' }}>
            {/* Subtle ambient glow behind the chart — dynamic color */}
            <div style={{
              position: 'absolute', top: '20%', left: '15%', width: '70%', height: '60%',
              background: netPnL >= 0
                ? 'radial-gradient(ellipse at center, rgba(52, 211, 153, 0.10) 0%, transparent 70%)'
                : 'radial-gradient(ellipse at center, rgba(248, 113, 113, 0.10) 0%, transparent 70%)',
              pointerEvents: 'none', zIndex: 0
            }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: 'var(--s4)', position: 'relative', zIndex: 1 }}>
              <div>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  ACCOUNT EQUITY
                </h3>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem' }}>
                  Balance growth from a ${startBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} starting point (filtered trades)
                </p>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px', lineHeight: 1 }}>
                  ${(hoveredPoint !== null ? hoveredPoint : (startBalance + netPnL)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: netPnL >= 0 ? 'var(--profit)' : 'var(--loss)', lineHeight: 1 }}>
                  ${(startBalance + netPnL).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
            
            <div style={{ width: '100%', height: 260, position: 'relative', zIndex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={equityCurveData} 
                  margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
                  onMouseMove={(state) => {
                    if (state && state.activePayload && state.activePayload.length > 0) {
                      setHoveredPoint(state.activePayload[0].payload.equity);
                    }
                  }}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <defs>
                    <linearGradient id="eqGradientPsych" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={eqCurveColor} stopOpacity={0.30}/>
                      <stop offset="35%" stopColor={eqCurveColor} stopOpacity={0.10}/>
                      <stop offset="100%" stopColor={eqCurveColor} stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                  <XAxis dataKey="date" {...axisProps} tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'Inter' }} />
                  <YAxis 
                    {...axisProps} 
                    domain={['auto', 'auto']}
                    tickFormatter={(val) => `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'Inter' }}
                  />
                  <ReferenceLine 
                    y={startBalance} 
                    stroke="var(--border-strong)" 
                    strokeDasharray="4 4" 
                    strokeOpacity={0.6} 
                    label={{ value: 'Start', position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 9, dy: -10, dx: 10 }} 
                  />
                  <Tooltip content={<EquityTooltip />} />
                  {/* Main equity line with gradient fill */}
                  <Area 
                    type="monotone" 
                    dataKey="equity" 
                    stroke={eqCurveColor} 
                    strokeWidth={2} 
                    fill="url(#eqGradientPsych)" 
                    dot={false}
                    activeDot={{ r: 5, fill: eqCurveColor, stroke: 'var(--bg-primary)', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Psychology KPI Row */}
          <div className="analytics-kpi-row-1" style={{ marginTop: '4px' }}>
            {[
              { label: 'AVG FOMO', val: `${analytics.avgFomo}/10`, col: analytics.avgFomo <= 4 ? 'var(--profit)' : (analytics.avgFomo <= 7 ? 'var(--warn)' : 'var(--loss)'), sub: 'Lower is better' },
              { label: 'AVG CONFIDENCE', val: `${analytics.avgConf}/10`, col: 'var(--accent)', sub: 'Ideal is 6-8' },
              { label: 'WIN CONFIDENCE', val: `${analytics.avgWinConf}/10`, col: 'var(--profit)', sub: 'On green days' },
              { label: 'LOSS CONFIDENCE', val: `${analytics.avgLossConf}/10`, col: 'var(--loss)', sub: 'On red days' },
              { label: 'REVENGE TRADES', val: `${analytics.revengeCount}`, col: analytics.revengeCount > 0 ? 'var(--loss)' : 'var(--text-secondary)', sub: 'Over-trading count' },
              { label: 'FOMO PNL COST', val: `${analytics.fomoCost >= 0 ? '+' : ''}$${analytics.fomoCost.toLocaleString()}`, col: analytics.fomoCost >= 0 ? 'var(--profit)' : 'var(--loss)', sub: 'On FOMO >= 7' },
              { label: 'DISCIPLINED PNL', val: `${analytics.disciplinedPnL >= 0 ? '+' : ''}$${analytics.disciplinedPnL.toLocaleString()}`, col: analytics.disciplinedPnL >= 0 ? 'var(--profit)' : 'var(--loss)', sub: 'FOMO <=3, Conf >=7' }
            ].map((k, i) => (
              <div key={i} className="glass stat-card" style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.04em', color: 'var(--text-tertiary)' }}>{k.label}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: k.col, fontFamily: 'JetBrains Mono', wordBreak: 'break-word', lineHeight: 1.2 }}>{k.val}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 500 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="analytics-grid">
            {/* P&L vs FOMO (Scatter) */}
            <div className="glass chart-panel anim-fade-up delay-2">
              <div className="chart-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>P&L vs FOMO Level</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 500 }}>Bubble colors: trade result</span>
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <ScatterChart margin={{ top: 15, right: 15, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                  <XAxis type="number" dataKey="fomo" domain={[0, 10]} name="FOMO" {...axisProps}/>
                  <YAxis type="number" dataKey="pnl" name="P&L" {...axisProps} tickFormatter={(val) => `$${val}`}/>
                  <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="3 3"/>
                  <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'var(--border-strong)' }}/>
                  <Scatter name="FOMO" data={analytics.scatterData} fill="var(--profit)" r={6}>
                    {analytics.scatterData.map((e, i) => (
                      <Cell key={`fomo-cell-${i}`} fill={e.pnl >= 0 ? 'var(--profit)' : 'var(--loss)'} opacity={0.7} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* P&L vs Confidence (Scatter) */}
            <div className="glass chart-panel anim-fade-up delay-3">
              <div className="chart-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>P&L vs Confidence</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 500 }}>Bubble colors: trade result</span>
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <ScatterChart margin={{ top: 15, right: 15, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                  <XAxis type="number" dataKey="confidence" domain={[0, 10]} name="Confidence" {...axisProps}/>
                  <YAxis type="number" dataKey="pnl" name="P&L" {...axisProps} tickFormatter={(val) => `$${val}`}/>
                  <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="3 3"/>
                  <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'var(--border-strong)' }}/>
                  <Scatter name="Confidence" data={analytics.scatterData} fill="var(--accent)" r={6}>
                    {analytics.scatterData.map((e, i) => (
                      <Cell key={`conf-cell-${i}`} fill={e.pnl >= 0 ? 'var(--accent)' : 'var(--loss)'} opacity={0.7} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Avg P&L by FOMO */}
            <div className="glass chart-panel anim-fade-up delay-4">
              <div className="chart-title"><span>Avg P&L by FOMO Level</span></div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.fomoBar} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                  <XAxis dataKey="name" {...axisProps}/>
                  <YAxis {...axisProps} tickFormatter={(val) => `$${val}`}/>
                  <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="3 3"/>
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--surface-glass)' }}/>
                  <Bar dataKey="avgPnl" radius={[4, 4, 0, 0]}>
                    {analytics.fomoBar.map((e, i) => (
                      <Cell key={i} fill={e.avgPnl >= 0 ? 'var(--profit)' : 'var(--loss)'} opacity={0.7}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Avg P&L by Confidence */}
            <div className="glass chart-panel anim-fade-up delay-5">
              <div className="chart-title"><span>Avg P&L by Confidence Level</span></div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.confBar} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                  <XAxis dataKey="name" {...axisProps}/>
                  <YAxis {...axisProps} tickFormatter={(val) => `$${val}`}/>
                  <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="3 3"/>
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--surface-glass)' }}/>
                  <Bar dataKey="avgPnl" radius={[4, 4, 0, 0]}>
                    {analytics.confBar.map((e, i) => (
                      <Cell key={i} fill={e.avgPnl >= 0 ? 'var(--accent)' : 'var(--loss)'} opacity={0.7}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Emotion Frequency Wide Panel */}
            {analytics.topTags.length > 0 && (
              <div className="glass chart-panel analytics-wide anim-fade-up delay-6" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                <div className="chart-title" style={{ margin: 0 }}><span>Emotion Frequency</span></div>
                <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
                  {analytics.topTags.map(([tag, count]) => (
                    <div key={tag} style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--s2)',
                      padding: '6px 14px', background: `${EMOTION_COLORS[tag] || '#818cf8'}12`,
                      border: `1px solid ${EMOTION_COLORS[tag] || '#818cf8'}30`,
                      borderRadius: 'var(--r-full)', fontSize: '0.72rem',
                      color: EMOTION_COLORS[tag] || '#818cf8', fontWeight: 600,
                    }}>
                      {tag}
                      <span style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--r-full)', padding: '1px 6px', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Emotions;
