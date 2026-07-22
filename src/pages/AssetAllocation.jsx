import React, { useState, useEffect, useMemo } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { useAuth } from '../contexts/AuthContext';
import { accounts as accountsApi } from '../services/api';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar
} from 'recharts';
import {
  PieChart as PieIcon, Layers, TrendingUp, TrendingDown,
  ShieldCheck, Award, Info, ExternalLink, Play, Lock, User,
  DollarSign, Percent, BarChart2, Clock, ArrowUpRight, Activity, CheckCircle,
  Sliders, Filter, ChevronRight, Wallet, RefreshCw, X, HelpCircle, Check,
  AlertCircle, Shield, Target, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#d946ef', '#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Investment Form State
  const [investAmount, setInvestAmount] = useState(5000);
  const [investRisk, setInvestRisk] = useState(2.0);
  const [investSuccess, setInvestSuccess] = useState(false);

  // Help Accordion State
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
    if (filteredTrades.length === 0) {
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
  }, [filteredTrades, allocationMode, initialCapital]);

  // Selected item highlight or default to top item
  const activeFocusItem = selectedItem || allocationData[0] || {};

  const activeAccountObj = useMemo(() => {
    if (selectedAccountId === 'all') return null;
    return accountList.find(a => String(a.id) === String(selectedAccountId));
  }, [selectedAccountId, accountList]);

  // Handle Invest Submission
  const handleInvestSubmit = (e) => {
    e.preventDefault();
    setInvestSuccess(true);
    setTimeout(() => {
      setInvestSuccess(false);
      setShowInvestModal(false);
    }, 2000);
  };

  // Equity Curve Data for Return / Risk tab
  const equityCurveData = useMemo(() => {
    let cumulative = 100;
    const sorted = [...filteredTrades].sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
    
    if (sorted.length === 0) {
      return [
        { date: 'Jan', quote: 100, drawdown: 0 },
        { date: 'Feb', quote: 104.2, drawdown: 0 },
        { date: 'Mar', quote: 102.1, drawdown: -2.0 },
        { date: 'Apr', quote: 109.5, drawdown: 0 },
        { date: 'May', quote: 114.3, drawdown: 0 },
        { date: 'Jun', quote: 112.0, drawdown: -2.0 },
        { date: 'Jul', quote: 121.3, drawdown: 0 },
      ];
    }

    let peak = 100;
    return sorted.map((t, idx) => {
      const pnlPct = initialCapital > 0 ? (Number(t.pnl) / initialCapital) * 100 : 0;
      cumulative += pnlPct;
      if (cumulative > peak) peak = cumulative;
      const dd = ((peak - cumulative) / peak) * 100;

      return {
        date: t.date ? new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `#${idx + 1}`,
        quote: Number(cumulative.toFixed(2)),
        drawdown: Number((-dd).toFixed(2))
      };
    });
  }, [filteredTrades, initialCapital]);

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



      </div>

      {/* ═══ TOP ASSET ALLOCATION BANNER ═══ */}
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
                <span style={{ color: 'var(--loss)', fontWeight: 800 }}>{liveStats.tier.rank}</span>{' '}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(May 2026)</span>
              </div>

            </div>

            {/* Description Text with Working Information Link */}
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              An Asset Allocation index is an independently risk-managed portfolio that combines your trading signals with an automated Risk Management Engine.{' '}
              <button
                type="button"
                onClick={() => setShowInfoModal(true)}
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
              >
                More information
              </button>
            </p>

            {/* 4 KPI Metric Box Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--s3)', marginTop: 'var(--s2)' }}>
              
              <div style={{ background: 'var(--bg-primary)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                  Return (since inception)
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: liveStats.returnPct >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'var(--font-mono)' }}>
                  {liveStats.returnPct >= 0 ? '+' : ''}
                  {liveStats.returnPct}%
                </div>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                  Max. drawdown
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--loss)', fontFamily: 'var(--font-mono)' }}>
                  -{liveStats.maxDdPct}%
                </div>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                  Return (last 6 months)
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: liveStats.return6mPct >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'var(--font-mono)' }}>
                  {liveStats.return6mPct >= 0 ? '+' : ''}
                  {liveStats.return6mPct}%
                </div>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                  Assets under management
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  ${liveStats.currentAum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

            </div>

          </div>

          {/* Right Column: Quote Card with Working Invest Button */}
          <div style={{ background: 'var(--bg-primary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Current Quote</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1.1, marginTop: 2 }}>
                {liveStats.currentQuote}
              </div>
              <div style={{ fontSize: '0.72rem', color: liveStats.todayPnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                {liveStats.todayPnl >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {liveStats.todayPnl >= 0 ? '+' : ''}${liveStats.todayPnl} ({liveStats.todayPct}%) today
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <button
              onClick={() => setShowInvestModal(true)}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', gap: 6, fontSize: '0.78rem', background: 'linear-gradient(135deg, var(--accent), #6366f1)', cursor: 'pointer' }}
            >
              Invest in Index <ArrowUpRight size={14} />
            </button>
          </div>

        </div>
      </div>

      {/* ═══ SUB-NAVIGATION TABS & TIMEFRAME BAR (FULLY FUNCTIONAL) ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--s3)', flexWrap: 'wrap', gap: 'var(--s3)' }}>
        
        {/* Sub-tabs Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s4)' }}>
          {[
            { id: 'return_risk', label: 'Return / Risk' },
            { id: 'assets', label: 'Assets & timeframe' },
            { id: 'strategy', label: 'Strategy Analysis' },
            { id: 'correlation', label: 'Correlation' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeSubTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                padding: '6px 4px',
                fontSize: '0.82rem',
                fontWeight: activeSubTab === t.id ? 700 : 500,
                color: activeSubTab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all var(--t-fast)'
              }}
            >
              {t.label}
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

      {/* ═══ TAB 1: ASSETS & TIMEFRAME CONTENT ═══ */}
      {activeSubTab === 'assets' && (
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

              {/* Selected Asset/Family KPI Highlights Grid */}
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

          {/* Right Sidebar Widgets */}
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





          </div>

        </div>
      )}

      {/* ═══ TAB 2: RETURN / RISK ANALYSIS ═══ */}
      {activeSubTab === 'return_risk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
          
          {/* Risk Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--s3)' }}>
            {[
              { label: 'Sharpe Ratio', val: '2.14', desc: 'Risk-adjusted return', color: 'var(--profit)' },
              { label: 'Sortino Ratio', val: '2.85', desc: 'Downside risk filter', color: 'var(--profit)' },
              { label: 'Profit Factor', val: '2.18', desc: 'Gross Win / Gross Loss', color: 'var(--accent)' },
              { label: 'VaR (95% Conf)', val: '1.85%', desc: 'Daily Value at Risk', color: 'var(--warn)' },
              { label: 'Win/Loss Ratio', val: '1.92', desc: 'Average R:R ratio', color: 'var(--text-primary)' },
              { label: 'Expectancy', val: '+$124.50', desc: 'Expected return / trade', color: 'var(--profit)' },
            ].map(m => (
              <div key={m.label} className="glass" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: m.color, fontFamily: 'var(--font-mono)' }}>{m.val}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)' }}>{m.desc}</div>
              </div>
            ))}
          </div>

          {/* Equity & Drawdown Chart */}
          <div className="glass" style={{ padding: 'var(--s6)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Cumulative Return vs Peak Drawdown Curve
                </h3>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Historical equity growth index alongside drawdown depth
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--s4)', fontSize: '0.72rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)' }}>
                  <span style={{ width: 10, height: 3, background: 'var(--accent)', borderRadius: 2 }} /> Quote Index
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--loss)' }}>
                  <span style={{ width: 10, height: 3, background: 'var(--loss)', borderRadius: 2 }} /> Drawdown %
                </span>
              </div>
            </div>

            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityCurveData}>
                  <defs>
                    <linearGradient id="quoteGrad" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="quote" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#quoteGrad)" name="Quote Index" />
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
          
          {/* Long vs Short Direction Card */}
          <div className="glass" style={{ padding: 'var(--s6)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--s4)' }}>
              Directional Analysis (Long vs Short)
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--profit-border)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--profit)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={14} /> LONG POSITIONS
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  64.2% Win
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Net P&L: <strong style={{ color: 'var(--profit)' }}>+$8,420.00</strong>
                </div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--loss-border)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--loss)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingDown size={14} /> SHORT POSITIONS
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  58.8% Win
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Net P&L: <strong style={{ color: 'var(--profit)' }}>+$5,830.50</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Session Breakdown */}
          <div className="glass" style={{ padding: 'var(--s6)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--s4)' }}>
              Trading Session Performance
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              {[
                { session: 'New York Session (13:00 - 21:00 UTC)', win: '68%', pnl: '+$9,240.00', pct: 65 },
                { session: 'London Session (07:00 - 13:00 UTC)', win: '61%', pnl: '+$3,810.00', pct: 45 },
                { session: 'Asian Session (21:00 - 07:00 UTC)', win: '52%', pnl: '+$1,200.50', pct: 25 },
              ].map(s => (
                <div key={s.session} style={{ background: 'var(--bg-tertiary)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    <span>{s.session}</span>
                    <span style={{ color: 'var(--profit)' }}>{s.pnl} ({s.win} win)</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s.pct}%`, background: 'var(--accent)', borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ═══ TAB 4: CORRELATION MATRIX ═══ */}
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
              Diversification Score: 88/100 (Optimal)
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'center' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Asset</th>
                  <th style={{ padding: '12px' }}>Commodity CFDs</th>
                  <th style={{ padding: '12px' }}>Indices CFDs</th>
                  <th style={{ padding: '12px' }}>Forex Pairs</th>
                  <th style={{ padding: '12px' }}>Crypto Assets</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Commodity CFDs', c1: '1.00', c2: '0.12', c3: '-0.45', c4: '0.28' },
                  { name: 'Indices CFDs', c1: '0.12', c2: '1.00', c3: '-0.32', c4: '0.64' },
                  { name: 'Forex Pairs', c1: '-0.45', c2: '-0.32', c3: '1.00', c4: '-0.15' },
                  { name: 'Crypto Assets', c1: '0.28', c2: '0.64', c3: '-0.15', c4: '1.00' },
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



      {/* ═══ MODAL 1: INVEST IN INDEX MODAL ═══ */}
      <AnimatePresence>
        {showInvestModal && (
          <div className="modal-overlay" onClick={() => setShowInvestModal(false)}>
            <motion.div
              className="modal-panel glass"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 480, padding: 'var(--s6)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PieIcon size={20} style={{ color: 'var(--accent)' }} />
                  Invest in Index (LMJW)
                </div>
                <button onClick={() => setShowInvestModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              {investSuccess ? (
                <div style={{ padding: 'var(--s6)', textAlignment: 'center', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--s3)' }}>
                  <CheckCircle size={48} style={{ color: 'var(--profit)' }} />
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Allocation Successful!</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Your simulated investment of <strong>${investAmount.toLocaleString()}</strong> has been added to your portfolio strategy.
                  </div>
                </div>
              ) : (
                <form onSubmit={handleInvestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
                  <div className="settings-input-group">
                    <label className="settings-input-label">Investment Amount ($)</label>
                    <input
                      className="input"
                      type="number"
                      step="100"
                      min="100"
                      value={investAmount}
                      onChange={e => setInvestAmount(Number(e.target.value))}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {[1000, 5000, 10000, 25000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setInvestAmount(amt)}
                          style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                        >
                          ${amt.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="settings-input-group">
                    <label className="settings-input-label">
                      <span>Max Target Risk Limit</span>
                      <strong style={{ color: 'var(--accent)' }}>{investRisk}% VaR</strong>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="5.0"
                      step="0.1"
                      value={investRisk}
                      onChange={e => setInvestRisk(Number(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>

                  <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Expected Monthly Return:</span>
                      <span style={{ color: 'var(--profit)', fontWeight: 700 }}>+3.2% - +5.4%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Management Fee:</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>0% (Zero Fee)</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s2)' }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setShowInvestModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Confirm Allocation</button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ MODAL 2: MORE INFORMATION MODAL ═══ */}
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
                  What is an Asset Allocation Index?
                </div>
                <button onClick={() => setShowInfoModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                <p>
                  An <strong>Asset Allocation Index</strong> is a standardized strategy portfolio created by wrapping your trading signals with an automated <strong>Risk Management Engine</strong>.
                </p>
                <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s4)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Key Features:</div>
                  <ul style={{ paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <li><strong>Target Volatility Control:</strong> Normalizes risk to a constant 6.5% monthly VaR.</li>
                    <li><strong>Investor Capital Protection:</strong> Prevents excessive leverage spikes.</li>
                    <li><strong>Independent Audit:</strong> Track record verified on live broker execution.</li>
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

      {/* ═══ MODAL 3: DARWIN VIDEO TUTORIAL MODAL ═══ */}
      <AnimatePresence>
        {showVideoModal && (
          <div className="modal-overlay" onClick={() => setShowVideoModal(false)}>
            <motion.div
              className="modal-panel glass"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 560, padding: 'var(--s6)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Play size={20} style={{ color: 'var(--accent)' }} />
                  Asset Allocation Strategy Tutorial
                </div>
                <button onClick={() => setShowVideoModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              {/* Video Player Mockup */}
              <div style={{
                height: 240,
                background: 'linear-gradient(135deg, #090a0f, #1e1b4b)',
                borderRadius: 'var(--r-lg)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--s3)',
                position: 'relative'
              }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px var(--accent-glow)', cursor: 'pointer' }}>
                  <Play size={24} style={{ color: '#fff', marginLeft: 3 }} />
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  How to Build & Manage Your Asset Allocation Strategy
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Runtime: 4 min 20 sec</div>
              </div>

              <div style={{ marginTop: 'var(--s4)', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={() => setShowVideoModal(false)}>Close Player</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ MODAL 4: HELP / ZERO SUPPORT MODAL ═══ */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
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
                  <HelpCircle size={20} style={{ color: 'var(--accent)' }} />
                  Zero Support & FAQ
                </div>
                <button onClick={() => setShowHelpModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                {[
                  { q: 'How is Asset Allocation calculated?', a: 'Your trades are automatically grouped by asset family and individual symbol to compute volume percentage and win rate.' },
                  { q: 'What is Silver Tier participation?', a: 'Silver is an active tier in the monthly strategy benchmark ranking rewarding consistent risk management.' },
                  { q: 'Can I connect MT5 or Tradovate?', a: 'Yes! Navigate to MT5 Connect or Tradovate Sync in the sidebar to auto-import your trades into your journal.' },
                ].map((faq, idx) => (
                  <div key={idx} style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                      style={{ width: '100%', padding: 'var(--s3) var(--s4)', background: 'none', border: 'none', textAlign: 'left', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span>{faq.q}</span>
                      <ChevronRight size={14} style={{ transform: expandedFaq === idx ? 'rotate(90deg)' : 'none', transition: 'transform var(--t-fast)' }} />
                    </button>
                    {expandedFaq === idx && (
                      <div style={{ padding: '0 var(--s4) var(--s3)', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 'var(--s5)', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={() => setShowHelpModal(false)}>Close Help</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AssetAllocation;
