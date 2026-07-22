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
import { Brain, Zap, Activity, ArrowRight, TrendingUp, TrendingDown, Target, Plus, Filter, RotateCcw, ShieldCheck, AlertCircle } from 'lucide-react';

const EMOTION_COLORS = {
  Calm: '#818cf8', Confident: '#34d399', Anxious: '#fbbf24',
  Fearful: '#fca5a5', Greedy: '#f97316', FOMO: '#f87171',
  Disciplined: '#60a5fa', Revenge: '#ef4444',
};

// Helper to format currency values cleanly with sign, dollar sign, and 2 decimal places
const formatCurrency = (val) => {
  const num = Number(val) || 0;
  const isNegative = num < 0;
  const absVal = Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return isNegative ? `-$${absVal}` : `+$${absVal}`;
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
    const hour = date.getUTCHours();
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

  // Fetch accounts list
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

  // Accounts list
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
      if (startDate) {
        const entryDateStr = t.entryTime || t.entry_time;
        if (entryDateStr && entryDateStr.split('T')[0] < startDate) return false;
      }
      if (endDate) {
        const entryDateStr = t.entryTime || t.entry_time;
        if (entryDateStr && entryDateStr.split('T')[0] > endDate) return false;
      }
      if (selectedAccount !== 'All') {
        const accId = t.accountId || t.account_id || 1;
        if (String(accId) !== String(selectedAccount)) return false;
      }
      if (selectedPair !== 'All') {
        if (t.symbol?.toUpperCase() !== selectedPair.toUpperCase()) return false;
      }
      if (selectedSession !== 'All') {
        const session = getTradeSession(t);
        if (session !== selectedSession) return false;
      }
      if (selectedSetup !== 'All') {
        if (t.setup !== selectedSetup) return false;
      }
      if (selectedDirection !== 'All') {
        if (t.type !== selectedDirection) return false;
      }
      if (selectedResult !== 'All') {
        if (selectedResult === 'Win' && t.pnl <= 0) return false;
        if (selectedResult === 'Loss' && t.pnl >= 0) return false;
        if (selectedResult === 'Breakeven' && t.pnl !== 0) return false;
      }
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

    // Discipline Index Score
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
        date: t.entryTime ? format(new Date(t.entryTime), 'MMM d, yy') : `#${idx + 1}`,
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

  // Equity curve color logic
  const eqCurveColor = netPnL >= 0 ? 'var(--profit)' : 'var(--loss)';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)', paddingBottom: '60px' }}>
      
      {/* ═══ PAGE HEADER ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--s3)' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Trading Psychology</h1>
          <p className="page-subtitle" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, marginTop: 2 }}>
            Analyze how emotional discipline, FOMO control, and confidence directly impact your P&L performance.
          </p>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={() => navigate('/journal')} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            background: 'linear-gradient(135deg, var(--accent), #6366f1)',
            fontWeight: 700,
            borderRadius: 'var(--r-md)',
            padding: '8px 16px',
            fontSize: '0.78rem',
            cursor: 'pointer'
          }}
        >
          <Plus size={14} /> New Trade
        </button>
      </div>

      {/* ═══ SLEEK CLEAN FILTERS BAR ═══ */}
      <div className="glass" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          <Filter size={14} style={{ color: 'var(--accent)' }} />
          Psychology Filters & Scope
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input 
            type="date" 
            className="input" 
            style={{ width: 'auto', flex: '1 1 120px', fontSize: '0.78rem', height: '34px', minWidth: '120px' }} 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
            placeholder="From Date"
          />
          <input 
            type="date" 
            className="input" 
            style={{ width: 'auto', flex: '1 1 120px', fontSize: '0.78rem', height: '34px', minWidth: '120px' }} 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)} 
            placeholder="To Date"
          />
          
          <select className="input" style={{ width: 'auto', flex: '1 1 130px', fontSize: '0.78rem', height: '34px', cursor: 'pointer' }} value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
            <option value="All">Account: All accounts</option>
            {accountsList.map(acc => <option key={acc.id} value={acc.id}>{acc.accountName}</option>)}
          </select>

          <select className="input" style={{ width: 'auto', flex: '1 1 110px', fontSize: '0.78rem', height: '34px', cursor: 'pointer' }} value={selectedPair} onChange={e => setSelectedPair(e.target.value)}>
            <option value="All">Pair: All</option>
            {uniquePairs.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select className="input" style={{ width: 'auto', flex: '1 1 110px', fontSize: '0.78rem', height: '34px', cursor: 'pointer' }} value={selectedSession} onChange={e => setSelectedSession(e.target.value)}>
            <option value="All">Session: All</option>
            <option value="London">London</option>
            <option value="New York">New York</option>
            <option value="Asia">Asia</option>
          </select>

          <select className="input" style={{ width: 'auto', flex: '1 1 110px', fontSize: '0.78rem', height: '34px', cursor: 'pointer' }} value={selectedSetup} onChange={e => setSelectedSetup(e.target.value)}>
            <option value="All">Setup: All</option>
            {uniqueSetups.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select className="input" style={{ width: 'auto', flex: '1 1 110px', fontSize: '0.78rem', height: '34px', cursor: 'pointer' }} value={selectedDirection} onChange={e => setSelectedDirection(e.target.value)}>
            <option value="All">Direction: All</option>
            <option value="Long">Long</option>
            <option value="Short">Short</option>
          </select>

          <select className="input" style={{ width: 'auto', flex: '1 1 110px', fontSize: '0.78rem', height: '34px', cursor: 'pointer' }} value={selectedResult} onChange={e => setSelectedResult(e.target.value)}>
            <option value="All">Result: All</option>
            <option value="Win">Win</option>
            <option value="Loss">Loss</option>
            <option value="Breakeven">Breakeven</option>
          </select>

          <select className="input" style={{ width: 'auto', flex: '1 1 90px', fontSize: '0.78rem', height: '34px', cursor: 'pointer' }} value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}>
            <option value="All">Grade: All</option>
            {['A+', 'A', 'B', 'C', 'D', 'F'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <button className="btn btn-ghost" style={{ height: '34px', padding: '0 14px', fontSize: '0.75rem', gap: 4, cursor: 'pointer' }} onClick={handleClearFilters}>
            <RotateCcw size={12} /> Clear
          </button>
        </div>
      </div>

      {!analytics ? (
        <div className="glass empty-state" style={{ padding: 'var(--s12)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--s3)' }}>
          <Brain size={42} style={{ opacity: 0.3, color: 'var(--accent)' }}/>
          <div className="empty-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>No psychology data available</div>
          <div className="empty-desc" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Log trade entries with emotion tags, FOMO rating (1-10), and Confidence rating (1-10) to unlock psychology analytics.
          </div>
        </div>
      ) : (
        <>
          {/* ═══ DISCIPLINE INDEX & MINDSET PROFILE ROW ═══ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s5)' }}>
            
            {/* Discipline Index Gauge Card */}
            <div className="glass" style={{ padding: 'var(--s5)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              <div>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Discipline Index</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: 0, marginTop: 2 }}>A 0-100 gauge reflecting emotional management based on FOMO & confidence</p>
              </div>

              <div style={{ display: 'flex', gap: 'var(--s5)', alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
                {/* SVG Gauge */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '120px', position: 'relative' }}>
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

                {/* Progress Indicators */}
                <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>FOMO Resistance</span>
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

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Average Confidence</span>
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

            {/* Mindset Profile Takeaways Card */}
            <div className="glass" style={{ padding: 'var(--s5)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              <div>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Mindset Profile Takeaways</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: 0, marginTop: 2 }}>Key takeaways based on your emotional trade logging</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', justifyContent: 'center', flex: 1, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'var(--bg-tertiary)', padding: 'var(--s3)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🧘</span>
                  <span style={{ lineHeight: 1.4 }}>
                    {analytics.disciplineScore >= 80 
                      ? 'Excellent risk control. Your executions are aligned with low FOMO and optimal confidence levels.' 
                      : (analytics.disciplineScore >= 65 
                        ? 'Good balance. However, minor emotional friction exists. Monitor setups that trigger FOMO.'
                        : 'Significant emotional slippage. You are likely chasing trades or executing out of boredom.')}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'var(--bg-tertiary)', padding: 'var(--s3)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>📊</span>
                  <span style={{ lineHeight: 1.4 }}>
                    Chasing setups has cost you a net total of{' '}
                    <strong style={{ color: analytics.fomoCost >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono', fontWeight: 800 }}>
                      {formatCurrency(analytics.fomoCost)}
                    </strong>. Keep FOMO levels low to avoid capital leaks.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'var(--bg-tertiary)', padding: 'var(--s3)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🔥</span>
                  <span style={{ lineHeight: 1.4 }}>
                    Disciplined trades (FOMO &le; 3, Conf &ge; 7) generated{' '}
                    <strong style={{ color: analytics.disciplinedPnL >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono', fontWeight: 800 }}>
                      {formatCurrency(analytics.disciplinedPnL)}
                    </strong>. Focus on standardizing this execution model.
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* ═══ ACCOUNT EQUITY CURVE CARD ═══ */}
          <div className="glass" style={{ padding: 'var(--s5)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: 'var(--s4)' }}>
              <div>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', margin: 0 }}>
                  ACCOUNT EQUITY
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem', margin: 0, marginTop: 2 }}>
                  Balance growth trajectory from ${startBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} starting balance
                </p>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px', lineHeight: 1, fontFamily: 'JetBrains Mono' }}>
                  ${(hoveredPoint !== null ? hoveredPoint : (startBalance + netPnL)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
                <span className="badge" style={{ background: netPnL >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: netPnL >= 0 ? 'var(--profit)' : 'var(--loss)', border: `1px solid ${netPnL >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, fontSize: '0.78rem', padding: '6px 14px', borderRadius: 'var(--r-full)', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                  {formatCurrency(netPnL)} Total P&L
                </span>
              </div>
            </div>
            
            <div style={{ width: '100%', height: 260 }}>
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
                  <XAxis dataKey="date" {...axisProps} />
                  <YAxis 
                    {...axisProps} 
                    domain={['auto', 'auto']}
                    tickFormatter={(val) => `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  />
                  <ReferenceLine 
                    y={startBalance} 
                    stroke="var(--border-strong)" 
                    strokeDasharray="4 4" 
                    strokeOpacity={0.6} 
                    label={{ value: 'Start', position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 9, dy: -10, dx: 10 }} 
                  />
                  <Tooltip content={<EquityTooltip />} />
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

          {/* ═══ PSYCHOLOGY KPI METRIC GRID ═══ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--s3)' }}>
            {[
              { label: 'AVG FOMO', val: `${analytics.avgFomo}/10`, col: analytics.avgFomo <= 4 ? 'var(--profit)' : (analytics.avgFomo <= 7 ? 'var(--warn)' : 'var(--loss)'), sub: 'Lower is better' },
              { label: 'AVG CONFIDENCE', val: `${analytics.avgConf}/10`, col: 'var(--accent)', sub: 'Ideal is 6-8' },
              { label: 'WIN CONFIDENCE', val: `${analytics.avgWinConf}/10`, col: 'var(--profit)', sub: 'On winning trades' },
              { label: 'LOSS CONFIDENCE', val: `${analytics.avgLossConf}/10`, col: 'var(--loss)', sub: 'On losing trades' },
              { label: 'REVENGE TRADES', val: `${analytics.revengeCount}`, col: analytics.revengeCount > 0 ? 'var(--loss)' : 'var(--text-secondary)', sub: 'Over-trading count' },
              { label: 'FOMO PNL COST', val: formatCurrency(analytics.fomoCost), col: analytics.fomoCost >= 0 ? 'var(--profit)' : 'var(--loss)', sub: 'On FOMO >= 7' },
              { label: 'DISCIPLINED PNL', val: formatCurrency(analytics.disciplinedPnL), col: analytics.disciplinedPnL >= 0 ? 'var(--profit)' : 'var(--loss)', sub: 'FOMO <=3, Conf >=7' }
            ].map((k, i) => (
              <div key={i} className="glass" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{k.label}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: k.col, fontFamily: 'JetBrains Mono', lineHeight: 1.2 }}>{k.val}</div>
                <div style={{ fontSize: '0.64rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ═══ PSYCHOLOGY SCATTER & BAR CHARTS GRID ═══ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s5)' }}>
            
            {/* P&L vs FOMO (Scatter) */}
            <div className="glass" style={{ padding: 'var(--s5)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s3)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>P&L vs FOMO Level</span>
                <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>Bubble colors: trade result</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart margin={{ top: 15, right: 15, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false}/>
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
            <div className="glass" style={{ padding: 'var(--s5)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s3)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>P&L vs Confidence</span>
                <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>Bubble colors: trade result</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart margin={{ top: 15, right: 15, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false}/>
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
            <div className="glass" style={{ padding: 'var(--s5)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--s3)' }}>
                Avg P&L by FOMO Level
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={analytics.fomoBar} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false}/>
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
            <div className="glass" style={{ padding: 'var(--s5)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--s3)' }}>
                Avg P&L by Confidence Level
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={analytics.confBar} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false}/>
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
              <div className="glass" style={{ gridColumn: 'span 2', padding: 'var(--s5)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Logged Emotion Frequency</div>
                <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
                  {analytics.topTags.map(([tag, count]) => (
                    <div key={tag} style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--s2)',
                      padding: '6px 14px', background: `${EMOTION_COLORS[tag] || '#818cf8'}12`,
                      border: `1px solid ${EMOTION_COLORS[tag] || '#818cf8'}30`,
                      borderRadius: 'var(--r-full)', fontSize: '0.75rem',
                      color: EMOTION_COLORS[tag] || '#818cf8', fontWeight: 600,
                    }}>
                      {tag}
                      <span style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--r-full)', padding: '1px 7px', fontSize: '0.62rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>{count}</span>
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
