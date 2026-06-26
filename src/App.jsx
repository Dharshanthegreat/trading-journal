import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, BarChart2, Brain,
  Image as ImageIcon, Settings as SettingsIcon,
  LogOut, Activity, TrendingUp, TrendingDown,
  Zap, CalendarDays, NotebookPen, Sun, Moon,
  Leaf, Compass, SunDim, Check, Palette,
  MessageSquare, Wifi, Send, Newspaper, FileText, Shield,
  Trophy, Wallet, Menu, X, Sparkles, Paintbrush, Layers, Cpu, Grid, Droplet, Square
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
import News from './pages/News';
import Notion from './pages/Notion';
import Stoic from './pages/Stoic';
import TradovateConnect from './pages/TradovateConnect';
import Accounts from './pages/Accounts';
import Achievements from './pages/Achievements';
import { ai as aiApi, publicApi, accounts as accountsApi } from './services/api';
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line
} from 'recharts';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import './App.css';
import useMagneticButtons from './hooks/useMagneticButtons';
import CustomCursor from './components/ui/CustomCursor';
import { formatInNewYork } from './utils/timezone';

// Internal parser helper to turn **bold** text into HTML strong tags
const parseBoldText = (text) => {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, idx) => {
    if (idx % 2 === 1) {
      return <strong key={idx} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{part}</strong>;
    }
    return part;
  });
};

// Custom Markdown Parser to style headers, lists, and bold text without third-party dependencies
const formatMessageContent = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    let content = line.trim();
    if (!content) return <div key={lineIdx} style={{ height: '8px' }} />;

    // Handle Headers
    if (content.startsWith('### ')) {
      return (
        <h4 key={lineIdx} style={{ fontSize: '0.88rem', fontWeight: 700, margin: '12px 0 6px 0', color: 'var(--text-primary)' }}>
          {parseBoldText(content.slice(4))}
        </h4>
      );
    }
    if (content.startsWith('**') && content.endsWith('**') && content.length > 4) {
      return (
        <h5 key={lineIdx} style={{ fontSize: '0.82rem', fontWeight: 600, margin: '8px 0 4px 0', color: 'var(--text-secondary)' }}>
          {parseBoldText(content.slice(2, -2))}
        </h5>
      );
    }

    // Handle Lists
    const isBulletList = content.startsWith('- ') || content.startsWith('* ');
    const isNumberedList = /^\d+\.\s/.test(content);

    if (isBulletList) {
      return (
        <li key={lineIdx} style={{ marginLeft: '12px', paddingLeft: '4px', fontSize: '0.78rem', lineHeight: '1.5', listStyleType: 'disc', margin: '4px 0' }}>
          {parseBoldText(content.substring(2))}
        </li>
      );
    }

    if (isNumberedList) {
      const match = content.match(/^(\d+\.)\s(.*)/);
      return (
        <div key={lineIdx} style={{ display: 'flex', gap: '6px', fontSize: '0.78rem', lineHeight: '1.5', margin: '4px 0 4px 6px' }}>
          <strong style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono', minWidth: '18px' }}>{match ? match[1] : ''}</strong>
          <span>{parseBoldText(match ? match[2] : content)}</span>
        </div>
      );
    }

    // Standard paragraphs
    return (
      <p key={lineIdx} style={{ fontSize: '0.78rem', lineHeight: '1.5', margin: '6px 0' }}>
        {parseBoldText(content)}
      </p>
    );
  });
};

/* ─── Dashboard ─────────────────────────────────── */
const Dashboard = () => {
  const { trades, fetchTrades, analytics, fetchAnalytics, loading } = useTrades();
  const { user } = useAuth();
  
  // Filter states
  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('All');
  const [selectedSetup, setSelectedSetup] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedAccount, setSelectedAccount] = useState('All');
  const [accounts, setAccounts] = useState([]);
  const [showAiChat, setShowAiChat] = useState(false);

  // Fetch/mock accounts list
  const fetchDashboardAccounts = useCallback(async () => {
    try {
      if (user?.isGuest) {
        const accIds = [...new Set(trades.map(t => t.accountId || t.account_id || 1))];
        const guestAccs = accIds.map(id => {
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
        setAccounts(guestAccs);
      } else {
        const data = await accountsApi.list();
        setAccounts(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch accounts in dashboard:', err);
    }
  }, [user, trades]);

  useEffect(() => {
    fetchDashboardAccounts();
  }, [fetchDashboardAccounts]);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('dashboard_dtg_ai_chat');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        role: 'assistant',
        content: "Hello! I am **DTG AI**, your trading coach powered by **NVIDIA Llama-3.1-Nemotron-70B-Instruct**.\n\nI can analyze your trading metrics, evaluate your setups, and debug your execution psychology. What would you like to review today?"
      }
    ];
  });
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('dashboard_dtg_ai_chat', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (showAiChat) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, aiLoading, showAiChat]);

  const handleSendAiMessage = async (e) => {
    if (e) e.preventDefault();
    if (!aiInput.trim() || aiLoading) return;

    const userMsg = { role: 'user', content: aiInput };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setAiInput('');
    setAiLoading(true);

    try {
      let res;
      if (user?.isGuest) {
        res = await publicApi.aiChat(user.guestToken, newMsgs);
      } else {
        res = await aiApi.chat(newMsgs);
      }
      setMessages([...newMsgs, { role: 'assistant', content: res.content }]);
    } catch (err) {
      setMessages([...newMsgs, { role: 'assistant', content: `❌ Error: ${err.message || 'Failed to connect to NVIDIA AI'}` }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSuggestionClick = (text) => {
    setAiInput(text);
  };
  useEffect(() => {
    fetchTrades({ limit: 200 });
    fetchAnalytics();
  }, []);
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
    } else if (dateRange === 'custom') {
      if (customStartDate) {
        result = result.filter(t => {
          const tDate = (t.entryTime || t.entry_time || '').split(/[T ]/)[0];
          return tDate && tDate >= customStartDate;
        });
      }
      if (customEndDate) {
        result = result.filter(t => {
          const tDate = (t.entryTime || t.entry_time || '').split(/[T ]/)[0];
          return tDate && tDate <= customEndDate;
        });
      }
    }

    // 1.5. Account filter
    if (selectedAccount !== 'All') {
      result = result.filter(t => String(t.accountId || t.account_id || 1) === String(selectedAccount));
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
  }, [trades, dateRange, selectedSymbol, selectedSetup, selectedType, selectedAccount, customStartDate, customEndDate]);

  // Handle reset
  const handleResetFilters = () => {
    setDateRange('all');
    setSelectedSymbol('All');
    setSelectedSetup('All');
    setSelectedType('All');
    setSelectedAccount('All');
    setCustomStartDate('');
    setCustomEndDate('');
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

  // Group trades by day to calculate Day Win %
  const dayStats = useMemo(() => {
    const days = {};
    filteredTrades.forEach(t => {
      const timeStr = t.entryTime || t.entry_time;
      if (!timeStr) return;
      const dateStr = timeStr.split('T')[0];
      if (!days[dateStr]) days[dateStr] = 0;
      days[dateStr] += t.pnl;
    });
    const dayList = Object.values(days);
    const totalDays = dayList.length;
    if (totalDays === 0) return { winRate: 0, wins: 0, losses: 0, scratch: 0 };
    const wins = dayList.filter(pnl => pnl > 0).length;
    const losses = dayList.filter(pnl => pnl < 0).length;
    const scratch = dayList.filter(pnl => pnl === 0).length;
    const winRate = ((wins / totalDays) * 100).toFixed(1);
    return { winRate: parseFloat(winRate), wins, losses, scratch };
  }, [filteredTrades]);

  // Compute Zella Radar Chart Data and Overall Zella Score
  const { scoreValue, radarData, consistencyScore } = useMemo(() => {
    if (filteredTrades.length === 0) {
      return {
        scoreValue: 0,
        radarData: [
          { subject: 'Win %', value: 0 },
          { subject: 'Profit Factor', value: 0 },
          { subject: 'Avg Win/Loss', value: 0 },
          { subject: 'Recovery Factor', value: 0 },
          { subject: 'Max Drawdown', value: 0 },
          { subject: 'Consistency', value: 0 },
        ],
        consistencyScore: 0
      };
    }

    const winRateScore = stats.winRate; // 0-100
    const pf = parseFloat(stats.profitFactor);
    const pfScore = isNaN(pf) || pf <= 0 ? 0 : (pf >= 3 ? 100 : (pf / 3) * 100);

    const avgWinNum = parseFloat(stats.avgWin);
    const avgLossNum = parseFloat(stats.avgLoss);
    const wlr = avgLossNum > 0 ? (avgWinNum / avgLossNum) : (avgWinNum > 0 ? 3 : 1);
    const wlrScore = wlr >= 3 ? 100 : (wlr / 3) * 100;

    const consistencyScore = Math.max(20, 100 - (stats.maxLossStreak * 12));

    const recoveryFactor = stats.maxDrawdown > 0 ? (stats.totalPnL / stats.maxDrawdown) : (stats.totalPnL > 0 ? 4 : 0);
    const rfScore = recoveryFactor <= 0 ? 0 : (recoveryFactor >= 4 ? 100 : (recoveryFactor / 4) * 100);

    const ddRatio = stats.totalPnL > 0 ? (stats.maxDrawdown / stats.totalPnL) : 1;
    const ddScore = Math.max(10, 100 - (ddRatio * 50));

    const scoreValue = parseFloat(((winRateScore + pfScore + wlrScore + consistencyScore + rfScore + ddScore) / 6).toFixed(1));

    const radarData = [
      { subject: 'Win %', value: winRateScore },
      { subject: 'Profit Factor', value: pfScore },
      { subject: 'Avg Win/Loss', value: wlrScore },
      { subject: 'Recovery Factor', value: rfScore },
      { subject: 'Max Drawdown', value: ddScore },
      { subject: 'Consistency', value: consistencyScore },
    ];

    return { scoreValue, radarData, consistencyScore };
  }, [filteredTrades, stats]);

  // Compute charts data
  const chartsData = useMemo(() => {
    const chronoTrades = [...filteredTrades].sort((a, b) => {
      const timeA = a.entryTime ? new Date(a.entryTime).getTime() : (a.entry_time ? new Date(a.entry_time).getTime() : 0);
      const timeB = b.entryTime ? new Date(b.entryTime).getTime() : (b.entry_time ? new Date(b.entry_time).getTime() : 0);
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || 0) - (b.id || 0);
    });
    
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

    return { equityCurve };
  }, [filteredTrades]);

  // Group trades by day for the Net Daily P&L bar chart
  const dailyPnlData = useMemo(() => {
    const days = {};
    const chronoTrades = [...filteredTrades].sort((a, b) => {
      const timeA = a.entryTime ? new Date(a.entryTime).getTime() : (a.entry_time ? new Date(a.entry_time).getTime() : 0);
      const timeB = b.entryTime ? new Date(b.entryTime).getTime() : (b.entry_time ? new Date(b.entry_time).getTime() : 0);
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || 0) - (b.id || 0);
    });
    chronoTrades.forEach(t => {
      const timeStr = t.entryTime || t.entry_time;
      if (!timeStr) return;
      const dateStr = format(new Date(timeStr), 'MM/dd/yy');
      if (!days[dateStr]) days[dateStr] = 0;
      days[dateStr] += t.pnl;
    });
    return Object.entries(days).map(([date, pnl]) => ({
      date,
      pnl: parseFloat(pnl.toFixed(2))
    }));
  }, [filteredTrades]);

  // Compute starting balance dynamically based on accounts list and selected account
  const startBalance = useMemo(() => {
    if (selectedAccount === 'All') {
      if (accounts.length > 0) {
        return accounts.reduce((acc, curr) => acc + (parseFloat(curr.startingBalance) || 0), 0);
      }
      return user?.accountSize ? parseFloat(user.accountSize) : 25000;
    } else {
      const acc = accounts.find(a => String(a.id) === String(selectedAccount));
      return acc ? (parseFloat(acc.startingBalance) || 0) : (user?.accountSize ? parseFloat(user.accountSize) : 25000);
    }
  }, [selectedAccount, accounts, user]);

  // Compute account balance curve based on dynamic user accountSize
  const balanceData = useMemo(() => {
    let balance = startBalance;
    const chronoTrades = [...filteredTrades].sort((a, b) => {
      const timeA = a.entryTime ? new Date(a.entryTime).getTime() : (a.entry_time ? new Date(a.entry_time).getTime() : 0);
      const timeB = b.entryTime ? new Date(b.entryTime).getTime() : (b.entry_time ? new Date(b.entry_time).getTime() : 0);
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || 0) - (b.id || 0);
    });
    return chronoTrades.map((t, idx) => {
      balance += t.pnl;
      return {
        index: idx + 1,
        date: t.entryTime ? format(new Date(t.entryTime), 'MM/dd/yy') : '',
        balance: parseFloat(balance.toFixed(2)),
        pnl: t.pnl
      };
    });
  }, [filteredTrades, startBalance]);

  // Compute drawdown curve
  const drawdownData = useMemo(() => {
    let running = 0;
    let peak = 0;
    const chronoTrades = [...filteredTrades].sort((a, b) => {
      const timeA = a.entryTime ? new Date(a.entryTime).getTime() : (a.entry_time ? new Date(a.entry_time).getTime() : 0);
      const timeB = b.entryTime ? new Date(b.entryTime).getTime() : (b.entry_time ? new Date(b.entry_time).getTime() : 0);
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || 0) - (b.id || 0);
    });
    return chronoTrades.map((t, idx) => {
      running += t.pnl;
      if (running > peak) peak = running;
      const dd = peak - running;
      return {
        index: idx + 1,
        date: t.entryTime ? format(new Date(t.entryTime), 'MM/dd/yy') : '',
        drawdown: parseFloat(dd.toFixed(2))
      };
    });
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

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
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
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem' }}>Cumulative P&L:</span>
          <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: p.equity >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
            {p.equity >= 0 ? '+' : ''}${p.equity?.toFixed(2)}
          </span>
        </div>
      </div>
    );
  };

  const BarTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const v = payload[0].value;
    const name = payload[0].payload.date;
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
    <div className="tz-dashboard-container">
      {/* Header Row */}
      <div className="tz-header">
        <div>
          <h1 className="tz-title">Dashboard</h1>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>
            "Focus on the process, not on the result"
          </p>
        </div>
        
        {/* Filters */}
        <div className="tz-filters">
          <button className="tz-filter-btn" style={{ padding: '6px 10px' }}>
            <span style={{ fontWeight: 700 }}>$</span>
          </button>
          
          {(dateRange !== 'all' || selectedSymbol !== 'All' || selectedSetup !== 'All' || selectedType !== 'All' || selectedAccount !== 'All') && (
            <div className="tz-filter-btn">
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                {[dateRange !== 'all', selectedSymbol !== 'All', selectedSetup !== 'All', selectedType !== 'All', selectedAccount !== 'All'].filter(Boolean).length} filter{[dateRange !== 'all', selectedSymbol !== 'All', selectedSetup !== 'All', selectedType !== 'All', selectedAccount !== 'All'].filter(Boolean).length > 1 ? 's' : ''}
              </span>
              <button className="tz-filter-clear" onClick={handleResetFilters}>×</button>
            </div>
          )}
          
          <div className="tz-filter-btn">
            <select value={dateRange} onChange={e => setDateRange(e.target.value)}>
              <option value="all">Date range</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="ytd">Year to Date</option>
              <option value="custom">Custom Date</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <>
              <div className="tz-filter-btn" style={{ padding: '4px 10px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>From:</span>
                <input 
                  type="date" 
                  value={customStartDate} 
                  onChange={e => setCustomStartDate(e.target.value)} 
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.72rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                />
              </div>
              <div className="tz-filter-btn" style={{ padding: '4px 10px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>To:</span>
                <input 
                  type="date" 
                  value={customEndDate} 
                  onChange={e => setCustomEndDate(e.target.value)} 
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.72rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </>
          )}

          <div className="tz-filter-btn">
            <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
              <option value="All">All accounts</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.accountName}</option>
              ))}
            </select>
          </div>
          
          <div className="tz-filter-btn">
            <select value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)}>
              <option value="All">All symbols</option>
              {uniqueSymbols.map(sym => (
                <option key={sym} value={sym}>{sym}</option>
              ))}
            </select>
          </div>

          <div className="tz-filter-btn">
            <select value={selectedSetup} onChange={e => setSelectedSetup(e.target.value)}>
              <option value="All">All setups</option>
              {uniqueSetups.map(s => (
                <option key={s} value={s}>{s || 'Untagged'}</option>
              ))}
            </select>
          </div>

          <button className="tz-filter-btn" onClick={() => setShowAiChat(true)} style={{ background: 'var(--accent-soft)', borderColor: 'var(--border-accent)', color: 'var(--text-primary)', fontWeight: 600 }}>
            <Brain size={13} style={{ color: 'var(--accent)' }} /> DTG AI
          </button>
        </div>
      </div>
      
      {/* Resync Bar */}
      <div className="tz-resync-bar">
        <div>
          Last import: {trades.length > 0 && (trades[0].entryTime || trades[0].entry_time) ? format(new Date(trades[0].entryTime || trades[0].entry_time), 'MMM d, yyyy hh:mm a') : format(new Date(), 'MMM d, yyyy hh:mm a')}
          <span className="tz-resync-link" onClick={() => fetchTrades({ limit: 200 })}>Resync</span>
        </div>
        <button className="tz-btn-primary" onClick={() => fetchTrades({ limit: 200 })}>
          <Zap size={14} /> Start my day
        </button>
      </div>

      {/* KPI cards */}
      <div className="tz-kpi-grid">
        {/* Card 1: Net P&L */}
        <div className="tz-kpi-card">
          <div className="tz-kpi-header">
            <div className="tz-kpi-label">
              Net P&L <Activity size={12} style={{ opacity: 0.6 }} />
            </div>
            <span style={{ background: 'var(--border)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.62rem' }}>
              {stats.totalTrades}
            </span>
          </div>
          <div className="tz-kpi-body">
            <div className="tz-kpi-val" style={{ color: stats.totalPnL >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
              {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </div>
            <div>
              <TrendingUp size={24} style={{ color: stats.totalPnL >= 0 ? 'var(--profit)' : 'var(--loss)', opacity: 0.8 }} />
            </div>
          </div>
        </div>

        {/* Card 2: Win Rate */}
        <div className="tz-kpi-card">
          <div className="tz-kpi-header">
            <div className="tz-kpi-label">
              Win Rate <Zap size={12} style={{ opacity: 0.6 }} />
            </div>
          </div>
          <div className="tz-kpi-body">
            <div className="tz-kpi-val">{stats.winRate.toFixed(0)}%</div>
            <div className="tz-kpi-gauge">
              <svg viewBox="0 0 100 50" style={{ width: '58px', height: '29px' }}>
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--border-strong)" strokeWidth="8" strokeLinecap="round" />
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--profit)" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray="125.66" strokeDashoffset={125.66 * (1 - stats.winRate / 100)} />
              </svg>
            </div>
          </div>
          <div className="tz-kpi-subtext">
            <span style={{ color: 'var(--profit)' }}>{stats.wins} W</span>
            <span style={{ color: 'var(--loss)' }}>{stats.losses} L</span>
            <span>{stats.totalTrades - stats.wins - stats.losses} S</span>
          </div>
        </div>

        {/* Card 3: Profit factor */}
        <div className="tz-kpi-card">
          <div className="tz-kpi-header">
            <div className="tz-kpi-label">
              Profit factor <BarChart2 size={12} style={{ opacity: 0.6 }} />
            </div>
          </div>
          <div className="tz-kpi-body">
            <div className="tz-kpi-val">{stats.profitFactor === 'Infinity' ? '—' : stats.profitFactor}</div>
            <div className="tz-kpi-gauge">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="12" fill="none" stroke="var(--border-strong)" strokeWidth="3" />
                <circle cx="16" cy="16" r="12" fill="none"
                        stroke={parseFloat(stats.profitFactor) >= 1.5 ? 'var(--profit)' : 'var(--loss)'}
                        strokeWidth="3"
                        strokeDasharray="75.4"
                        strokeDashoffset={stats.profitFactor === 'Infinity' ? 0 : 75.4 * (1 - Math.min(1, (parseFloat(stats.profitFactor) || 0) / 3))}
                        transform="rotate(-90 16 16)" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 4: Consistency */}
        <div className="tz-kpi-card">
          <div className="tz-kpi-header">
            <div className="tz-kpi-label">
              Consistency <Shield size={12} style={{ opacity: 0.6 }} />
            </div>
          </div>
          <div className="tz-kpi-body">
            <div className="tz-kpi-val">{consistencyScore.toFixed(0)}%</div>
            <div className="tz-kpi-gauge">
              <svg viewBox="0 0 100 50" style={{ width: '58px', height: '29px' }}>
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--border-strong)" strokeWidth="8" strokeLinecap="round" />
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--profit)" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray="125.66" strokeDashoffset={125.66 * (1 - consistencyScore / 100)} />
              </svg>
            </div>
          </div>
          <div className="tz-kpi-subtext" style={{ color: 'var(--text-muted)' }}>
            Max loss streak: <span style={{ color: 'var(--loss)', fontWeight: 600 }}>{stats.maxLossStreak}</span>
          </div>
        </div>

        {/* Card 5: Avg win/loss trade */}
        <div className="tz-kpi-card">
          <div className="tz-kpi-header">
            <div className="tz-kpi-label">
              Avg win/loss trade <BarChart2 size={12} style={{ opacity: 0.6 }} />
            </div>
          </div>
          <div className="tz-kpi-body" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
            <div className="tz-kpi-val" style={{ fontSize: '1.2rem', fontFamily: 'JetBrains Mono' }}>
              ${stats.avgWin} / -${stats.avgLoss}
            </div>
            <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', background: 'var(--border-strong)' }}>
              <div style={{
                width: `${parseFloat(stats.avgWin) + parseFloat(stats.avgLoss) > 0 ? (parseFloat(stats.avgWin) / (parseFloat(stats.avgWin) + parseFloat(stats.avgLoss)) * 100) : 50}%`,
                background: 'var(--profit)'
              }} />
              <div style={{ flex: 1, background: 'var(--loss)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Mid Section Grid */}
      <div className="tz-mid-grid">
        {/* Score */}
        <div className="tz-card">
          <div className="tz-card-header">
            <div className="tz-card-title">
              <Brain size={14} /> Score
            </div>
          </div>
          <div className="tz-radar-container">
            {filteredTrades.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="var(--border-mid)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 8 }} />
                  <Radar name="Score" dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Log trades to view score
              </div>
            )}
            
            <div className="tz-score-display">
              <div className="tz-score-label">Your Score</div>
              <div className="tz-score-value">{scoreValue}</div>
              
              <div className="tz-score-bar-wrapper">
                <div className="tz-score-bar-gradient" />
                <div className="tz-score-bar-pin" style={{ left: `${scoreValue}%` }} />
              </div>
              
              <div className="tz-score-bar-ticks">
                <span>0</span>
                <span>20</span>
                <span>40</span>
                <span>60</span>
                <span>80</span>
                <span>100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Net Cumulative P&L */}
        <div className="tz-card">
          <div className="tz-card-header">
            <div className="tz-card-title">
              <TrendingUp size={14} /> Daily Net Cumulative P&L
            </div>
          </div>
          {filteredTrades.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={chartsData.equityCurve} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="tzEquityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--profit)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--profit)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="equity" stroke="var(--profit)" strokeWidth={2} fill="url(#tzEquityGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              No trade data available
            </div>
          )}
        </div>

        {/* Net Daily P&L */}
        <div className="tz-card">
          <div className="tz-card-header">
            <div className="tz-card-title">
              <BarChart2 size={14} /> Net Daily P&L
            </div>
          </div>
          {dailyPnlData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={dailyPnlData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {dailyPnlData.map((entry, index) => (
                    <Cell key={`tz-pnl-${index}`} fill={entry.pnl >= 0 ? 'var(--profit)' : 'var(--loss)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              No daily logs available
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="tz-bottom-grid">
        {/* Recent Trades Table */}
        <div className="tz-card">
          <div className="tz-card-header">
            <div className="tz-card-title">
              <Activity size={14} /> Recent Trades
            </div>
          </div>
          
          <div className="tz-table-wrapper">
            {filteredTrades.length > 0 ? (
              <table className="tz-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Close Date</th>
                    <th style={{ textAlign: 'right' }}>Net P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.slice(0, 5).map((t, idx) => (
                    <tr key={t.id || idx}>
                      <td>
                        <span className={t.type === 'Long' ? 'tz-badge-buy' : 'tz-badge-sell'}>
                          {t.symbol} · {t.type}
                        </span>
                      </td>
                      <td>{t.exitTime || t.exit_time ? format(new Date(t.exitTime || t.exit_time), 'MM/dd/yyyy') : (t.entryTime || t.entry_time ? format(new Date(t.entryTime || t.entry_time), 'MM/dd/yyyy') : '—')}</td>
                      <td className={`tz-table-pnl ${t.pnl >= 0 ? 'profit' : 'loss'}`}>
                        {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 'var(--s8) 0', textTransform: 'uppercase', color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'center', fontWeight: 600 }}>
                No recent trades
              </div>
            )}
          </div>
        </div>

        {/* Account Balance Chart */}
        <div className="tz-card">
          <div className="tz-card-header">
            <div className="tz-card-title">
              <TrendingUp size={14} /> Account Balance
            </div>
          </div>
          {balanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={balanceData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} domain={['dataMin - 500', 'dataMax + 500']} axisLine={false} tickLine={false}/>
                <Tooltip />
                <Line type="monotone" dataKey="balance" stroke="var(--accent)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              No balance logs available
            </div>
          )}
        </div>

        {/* Drawdown Chart */}
        <div className="tz-card">
          <div className="tz-card-header">
            <div className="tz-card-title">
              <TrendingDown size={14} /> Drawdown
            </div>
          </div>
          {stats.maxDrawdown > 0 && drawdownData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={drawdownData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="tzDrawdownGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--loss)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="var(--loss)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false}/>
                <Tooltip />
                <Area type="monotone" dataKey="drawdown" stroke="var(--loss)" strokeWidth={1.5} fill="url(#tzDrawdownGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="tz-sleeping-cloud-container" style={{ padding: 'var(--s4) var(--s2)' }}>
              <svg className="tz-sleeping-cloud" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M46.5 37.5C48.9853 37.5 51 35.4853 51 33C51 30.5147 48.9853 28.5 46.5 28.5C45.8906 28.5 45.313 28.6212 44.7865 28.8406C43.8344 24.8727 40.2796 22 36 22C34.1843 22 32.5085 22.5273 31.0967 23.4357C29.625 21.3283 27.2246 20 24.5 20C19.8056 20 16 23.8056 16 28.5C16 28.8415 16.0201 29.1783 16.0592 29.5093C13.167 30.2974 11 32.9022 11 36C11 39.59 13.91 42.5 17.5 42.5H46.5" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M38 14L41 11M41 11H37M41 11V15" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M47 8L49 6M49 6H46M49 6V9" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div className="tz-sleeping-text">0% Drawdown. Peak Performance!</div>
            </div>
          )}
        </div>
      </div>

      {/* DTG AI Chat Drawer Pop-up */}
      {showAiChat && (
        <>
          {/* Drawer Backdrop overlay */}
          <div 
            onClick={() => setShowAiChat(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999
            }}
          />
          
          {/* Chat Window Panel */}
          <div 
            className="glass tz-card"
            style={{
              position: 'fixed',
              top: '12px',
              right: '12px',
              bottom: '12px',
              width: '420px',
              maxWidth: 'calc(100vw - 24px)',
              zIndex: 10000,
              boxShadow: 'var(--shadow-xl)',
              borderRadius: 'var(--r-xl)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-mid)',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden'
            }}
          >
            {/* Pop-up header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', padding: '16px 20px', background: 'var(--bg-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Brain size={16} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    DTG AI <span className="status-dot live" style={{ width: '6px', height: '6px' }} />
                  </div>
                  <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    NVIDIA Llama-3.1-Nemotron-70B
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowAiChat(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px', borderRadius: '4px' }}
              >
                <span style={{ fontSize: '1.2rem', fontWeight: 300, lineHeight: 1 }}>×</span>
              </button>
            </div>

            {/* Scrollable message content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {messages.map((msg, idx) => (
                <div 
                  key={idx}
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-primary)',
                    color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                    borderRadius: msg.role === 'user' ? '14px 14px 0 14px' : '0 14px 14px 14px',
                    padding: '10px 14px',
                    fontSize: '0.78rem',
                    boxShadow: 'var(--shadow-sm)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--border)'
                  }}
                >
                  <div style={{ fontSize: '0.62rem', color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                    {msg.role === 'user' ? 'YOU' : 'DTG AI'}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {msg.role === 'user' ? msg.content : formatMessageContent(msg.content)}
                  </div>
                </div>
              ))}
              
              {aiLoading && (
                <div style={{ alignSelf: 'flex-start', background: 'var(--bg-primary)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '0 14px 14px 14px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Nemotron-70B is thinking...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Suggestions Block */}
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Quick Diagnostics
              </div>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                {[
                  { text: 'Analyze my FOMO and psychology logs', label: 'Psychology Audit' },
                  { text: 'How can I optimize my win rate and reward size?', label: 'Performance Diagnostics' },
                  { text: 'Which setups are generating the best expectancy?', label: 'Setup Optimizer' },
                  { text: 'Review my risk management and lot sizes', label: 'Risk Audit' }
                ].map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(s.text)}
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '0.68rem',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendAiMessage} style={{ display: 'flex', borderTop: '1px solid var(--border)', padding: '12px 20px', background: 'var(--bg-primary)', gap: '8px', alignItems: 'center' }}>
              <input 
                type="text"
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                placeholder="Ask DTG AI Coach..."
                style={{
                  flex: 1,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-mid)',
                  borderRadius: 'var(--r-md)',
                  padding: '10px 14px',
                  fontSize: '0.75rem',
                  outline: 'none',
                  color: 'var(--text-primary)'
                }}
              />
              <button 
                type="submit"
                disabled={!aiInput.trim() || aiLoading}
                style={{
                  background: aiInput.trim() && !aiLoading ? 'var(--accent)' : 'var(--border)',
                  color: aiInput.trim() && !aiLoading ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: 'var(--r-md)',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: aiInput.trim() && !aiLoading ? 'pointer' : 'default'
                }}
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

/* ─── Sidebar ─────────────────────────────────── */
const MotionLink = motion.create(Link);

const sidebarNavVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05
    }
  }
};

const sidebarItemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 120,
      damping: 14
    }
  }
};

const Sidebar = ({ mobileMenuOpen, onClose }) => {
  const location = useLocation();
  const { logout, user } = useAuth();

  const nav = [
    { path: '/dashboard',     icon: <LayoutDashboard size={16}/>, label: 'Dashboard' },
    { path: '/accounts',      icon: <Wallet size={16}/>,          label: 'Accounts' },
    { path: '/journal',       icon: <BookOpen size={16}/>,        label: 'Journal' },
    { path: '/calendar',      icon: <CalendarDays size={16}/>,    label: 'Calendar' },
    { path: '/news',          icon: <Newspaper size={16}/>,       label: 'News Feed' },
    { path: '/notion',        icon: <FileText size={16}/>,        label: 'Notion Workspace' },
    { path: '/achievements',  icon: <Trophy size={16}/>,          label: 'Achievements' },
    { path: '/analytics',     icon: <BarChart2 size={16}/>,       label: 'Analytics' },
    { path: '/psychology',    icon: <Brain size={16}/>,           label: 'Psychology' },
    { path: '/stoic',         icon: <Shield size={16}/>,          label: 'Stoic Mindset' },
    { path: '/ai-coach',      icon: <MessageSquare size={16}/>,   label: 'AI Coach' },
    { path: '/tradingview',   icon: <TrendingUp size={16}/>,      label: 'TV Analysis' },
    { path: '/mt5-connect',   icon: <Wifi size={16}/>,             label: 'MT5 Connect' },
    { path: '/tradovate',     icon: <Zap size={16}/>,             label: 'Tradovate Sync' },
    { path: '/daily-journal', icon: <NotebookPen size={16}/>,     label: 'Daily Notes' },
    { path: '/charts',        icon: <ImageIcon size={16}/>,       label: 'Charts' },
  ];

  const initials = user?.displayName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'T';

  return (
    <>
      <div className={`sidebar-overlay ${mobileMenuOpen ? 'active' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--s1) var(--s2) var(--s4)' }}>
          <img 
            src={`${import.meta.env.BASE_URL}logo.png`} 
            alt="Trading Journal Logo" 
            style={{ 
              height: '38px', 
              width: 'auto', 
              borderRadius: 'var(--r-sm)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.05)'
            }} 
          />
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
            <X size={16} />
          </button>
        </div>

        <motion.div
          variants={sidebarNavVariants}
          initial="hidden"
          animate="visible"
          style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
        >
          <div className="nav-section-label">Navigation</div>
          <nav className="nav-links">
            {nav.map(item => (
              <MotionLink
                key={item.path}
                to={item.path}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                variants={sidebarItemVariants}
              >
                {item.icon}
                <span>{item.label}</span>
              </MotionLink>
            ))}
          </nav>

          <div style={{ marginTop: 'var(--s4)' }}>
            <div className="nav-section-label">System</div>
            <MotionLink
              to="/settings"
              className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}
              variants={sidebarItemVariants}
            >
              <SettingsIcon size={16}/>
              <span>Settings</span>
            </MotionLink>
          </div>
        </motion.div>

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
    </>
  );
};

/* ─── Header ─────────────────────────────────── */
const Header = ({ onMenuToggle }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [time, setTime] = useState(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    const checkMode = () => {
      const mode = localStorage.getItem('trading_journal_local_mode');
      setIsLocal(mode === 'local');
    };
    checkMode();
    const interval = setInterval(checkMode, 1500);
    return () => clearInterval(interval);
  }, []);

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
    '/': 'Landing Page', '/dashboard': 'Dashboard', '/journal': 'Journal', '/calendar': 'Calendar',
    '/news': 'News Feed', '/notion': 'Notion Workspace', '/stoic': 'Stoic Mindset',
    '/analytics': 'Analytics', '/psychology': 'Psychology',
    '/daily-journal': 'Daily Notes', '/charts': 'Charts', '/settings': 'Settings',
    '/tradingview': 'TradingView Analysis', '/ai-coach': 'AI Coach',
    '/mt5-connect': 'MT5 Connect',
    '/tradovate': 'Tradovate Connect',
    '/accounts': 'Trading Accounts',
    '/achievements': 'Achievements Wall',
  };

  const themeList = [
    { id: 'dark', name: 'Dark Theme', icon: <Moon size={13} />, bg: '#0a0b0f', accent: '#818cf8' },
    { id: 'minimal', name: 'Minimalist', icon: <Palette size={13} />, bg: '#ffffff', accent: '#000000' },
    { id: 'claymorphism', name: 'Claymorphism', icon: <Paintbrush size={13} />, bg: '#edf2f7', accent: '#6366f1' },
  ];

  const currentThemeObj = themeList.find(t => t.id === theme) || themeList[0];

  return (
    <header className="header">
      <div className="header-breadcrumb">
        <button className="mobile-menu-toggle" onClick={onMenuToggle} aria-label="Open menu">
          <Menu size={18} />
        </button>
        <span>Trading Journal</span>
        <span className="header-sep">/</span>
        <strong>{pageNames[location.pathname] || 'Page'}</strong>
      </div>
      <div className="header-right" style={{ gap: 'var(--s3)', position: 'relative', alignItems: 'center' }}>
        {/* Connection status indicator */}
        <div 
          onClick={() => {
            if (isLocal) {
              if (window.confirm("Switch to Cloud Database Mode? The app will reload and attempt to connect to your PostgreSQL server backend.")) {
                localStorage.setItem('trading_journal_local_mode', 'cloud');
                window.location.reload();
              }
            } else {
              if (window.confirm("Switch to Offline Browser Mode? Your data will be saved locally inside this browser instead of the database server.")) {
                localStorage.setItem('trading_journal_local_mode', 'local');
                window.location.reload();
              }
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.68rem',
            padding: '4px 8px',
            borderRadius: 'var(--r-sm)',
            background: isLocal ? 'var(--warn-soft)' : 'var(--profit-soft)',
            border: `1px solid ${isLocal ? 'rgba(251, 191, 36, 0.2)' : 'var(--profit-border)'}`,
            color: isLocal ? 'var(--warn)' : 'var(--profit)',
            fontWeight: 600,
            marginRight: '4px',
            cursor: 'pointer'
          }} 
          title={isLocal ? 'Click to switch to Cloud Mode. Currently: Database is offline. All data is saved inside your browser.' : 'Click to switch to Offline Mode. Currently: Server Connected. Data is saved in PostgreSQL database.'}
        >
          <span className="status-dot live" style={{
            background: isLocal ? 'var(--warn)' : 'var(--profit)',
            boxShadow: `0 0 6px ${isLocal ? 'rgba(251,191,36,0.4)' : 'rgba(52,211,153,0.4)'}`,
            animation: 'pulse-glow 2s infinite'
          }} />
          {isLocal ? 'Browser DB' : 'Cloud DB'}
        </div>
        <span className="header-time" title="New York Time (EST/EDT)">{formatInNewYork(time, 'HH:mm:ss')} NY</span>
        
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
  const { user, loading, logout } = useAuth();
  const { cursorEffect } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize global magnetic cursor hover effect using GSAP
  useMagneticButtons();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: 'var(--s4)',
        color: 'var(--text-muted)', fontSize: '0.8rem',
        background: 'var(--bg-primary)',
      }}>
        <img 
          src={`${import.meta.env.BASE_URL}logo.png`} 
          alt="Trading Journal Logo" 
          className="anim-fade-in"
          style={{ 
            width: '100%', 
            maxWidth: '220px', 
            height: 'auto', 
            borderRadius: 'var(--r-lg)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.05)',
            marginBottom: 'var(--s2)'
          }} 
        />
        Loading Trading Journal...
      </div>
    );
  }
  const isPublicRoute = location.pathname.startsWith('/shared/') && !location.pathname.startsWith('/shared/dashboard/');

  if (isPublicRoute) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
        {cursorEffect && <CustomCursor />}
        <Routes>
          <Route path="/shared/trade/:token" element={<SharedTrade />} />
        </Routes>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {cursorEffect && <CustomCursor />}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </>
    );
  }

  const isLanding = location.pathname === '/' || location.pathname === '/landing';
  if (isLanding) {
    return (
      <>
        {cursorEffect && <CustomCursor />}
        <LandingPage />
      </>
    );
  }

  return (
    <div className="app-container">
      {cursorEffect && <CustomCursor />}
      <Sidebar mobileMenuOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <main className="main-content">
        {user?.isGuest && (
          <div className="anim-fade-in" style={{
            background: 'linear-gradient(90deg, #1e1b4b, #312e81, #1e1b4b)',
            color: '#fff',
            padding: '10px var(--s5)',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(129, 140, 248, 0.3)',
            position: 'sticky',
            top: 0,
            zIndex: 1000
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1rem' }}>👀</span>
              <span>
                Showcase Mode (Read-Only) — Viewing <strong>{user?.displayName}</strong>'s trading workspace.
              </span>
            </div>
            <button
              onClick={logout}
              className="btn btn-secondary"
              style={{
                padding: '4px 10px',
                fontSize: '0.72rem',
                height: 'auto',
                lineHeight: 1,
                borderColor: 'rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                cursor: 'pointer',
                borderRadius: 'var(--r-md)'
              }}
            >
              Exit Showcase
            </button>
          </div>
        )}
        <Header onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <div className="page-container">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/shared/dashboard/:token" element={<Dashboard />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/news" element={<News />} />
            <Route path="/notion" element={<Notion />} />
            <Route path="/stoic" element={<Stoic />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/psychology" element={<Emotions />} />
            <Route path="/ai-coach" element={<AiCoach />} />
            <Route path="/tradingview" element={<TradingViewPage />} />
            <Route path="/mt5-connect" element={<MT5Connect />} />
            <Route path="/tradovate" element={<TradovateConnect />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/daily-journal" element={<DailyJournal />} />
            <Route path="/charts" element={<Charts />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
