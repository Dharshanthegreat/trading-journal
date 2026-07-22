import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, BarChart2, Brain,
  Image as ImageIcon, Settings as SettingsIcon,
  LogOut, Activity, TrendingUp, TrendingDown,
  Zap, CalendarDays, Calendar, NotebookPen, Sun, Moon,
  Leaf, Compass, SunDim, Check, Palette,
  MessageSquare, Wifi, Send, Newspaper, FileText, Shield,
  Trophy, Wallet, Menu, X, Sparkles, Paintbrush, Layers, Cpu, Grid, Droplet, Square,
  ListTodo, Filter, Database as DatabaseIcon, PieChart
} from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { TradeProvider, useTrades } from './contexts/TradeContext';
import { JournalProvider } from './contexts/JournalContext';
import LoginPage from './components/auth/LoginPage';
import Settings from './pages/Settings';
import Backup from './pages/Backup';
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
import OrbisNft from './pages/OrbisNft';
import News from './pages/News';
import Stoic from './pages/Stoic';
import TradovateConnect from './pages/TradovateConnect';
import Accounts from './pages/Accounts';
import Achievements from './pages/Achievements';
import Mondays from './pages/Mondays';
import TradingRules from './pages/TradingRules';
import AssetAllocation from './pages/AssetAllocation';
import { ai as aiApi, publicApi, accounts as accountsApi, rules as rulesApi, news as newsApi } from './services/api';
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

/* ─── Helpers for Dashboard Redesign ──────────────── */
const getCountdown = (eventDateStr) => {
  try {
    const eventDate = new Date(eventDateStr);
    const now = new Date();
    const diffMs = eventDate.getTime() - now.getTime();
    if (diffMs <= 0) return 'Passed';
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    return `${hours}h ${mins}m`;
  } catch (e) {
    return '—';
  }
};

const getEventTime = (eventDateStr) => {
  try {
    const d = new Date(eventDateStr);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
};

const isSameDay = (d1, d2) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

const getTradeDate = (t) => {
  const timeStr = t.exitTime || t.exit_time || t.entryTime || t.entry_time;
  return timeStr ? new Date(timeStr) : null;
};

const getFlagUrl = (countryCode) => {
  const code = (countryCode || '').toLowerCase();
  const mapping = {
    'usd': 'us',
    'cad': 'ca',
    'eur': 'eu',
    'gbp': 'gb',
    'jpy': 'jp',
    'aud': 'au',
    'nzd': 'nz',
    'chf': 'ch'
  };
  const flagCode = mapping[code] || code;
  return `https://flagcdn.com/w40/${flagCode}.png`;
};

const getWeekDays = (refDate) => {
  const current = new Date(refDate);
  const day = current.getDay();
  // Adjust so Monday is 1, Sunday is 0
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(current.setDate(diff));
  
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
};

/* ─── Dashboard ─────────────────────────────────── */
const Dashboard = () => {
  const { trades, fetchTrades, analytics, fetchAnalytics, loading } = useTrades();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const accountIdFromUrl = searchParams.get('accountId');
  
  // Filter states
  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());
  const [selectedSymbol, setSelectedSymbol] = useState('All');
  const [selectedSetup, setSelectedSetup] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedAccount, setSelectedAccount] = useState(accountIdFromUrl || 'All');
  const [accounts, setAccounts] = useState([]);
  const [showAiChat, setShowAiChat] = useState(false);

  // Redesign state additions
  const [pnlDisplayMode, setPnlDisplayMode] = useState(() => {
    return localStorage.getItem('tz_pnl_display_mode') || 'percent';
  });
  const [weekOffset, setWeekOffset] = useState(0);
  const [newsEvents, setNewsEvents] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // Sync state between Header and Dashboard
  useEffect(() => {
    const handlePnlModeChange = (e) => {
      setPnlDisplayMode(e.detail);
    };
    window.addEventListener('tz_pnl_display_mode_change', handlePnlModeChange);
    return () => window.removeEventListener('tz_pnl_display_mode_change', handlePnlModeChange);
  }, []);

  const handlePnlModeToggle = () => {
    const newVal = pnlDisplayMode === 'USD' ? 'percent' : 'USD';
    setPnlDisplayMode(newVal);
    localStorage.setItem('tz_pnl_display_mode', newVal);
    window.dispatchEvent(new CustomEvent('tz_pnl_display_mode_change', { detail: newVal }));
  };

  // Sync selectedAccount if URL parameter changes
  useEffect(() => {
    if (accountIdFromUrl) {
      setSelectedAccount(accountIdFromUrl);
    } else {
      setSelectedAccount('All');
    }
  }, [accountIdFromUrl]);

  const handleAccountChange = (val) => {
    setSelectedAccount(val);
    if (val === 'All') {
      searchParams.delete('accountId');
    } else {
      searchParams.set('accountId', val);
    }
    setSearchParams(searchParams);
  };

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

  // Fetch News Feed Monthly data when dashboard mounts
  useEffect(() => {
    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        const today = new Date();
        const data = await newsApi.list({ year: today.getFullYear(), month: today.getMonth() });
        setNewsEvents(data || []);
      } catch (err) {
        console.error('Failed to load news for dashboard:', err);
      } finally {
        setNewsLoading(false);
      }
    };
    fetchNews();
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
    setShowCustomDatePicker(false);
  };

  const handleDateSelectInPicker = (dateStr) => {
    if (!customStartDate || (customStartDate && customEndDate)) {
      setCustomStartDate(dateStr);
      setCustomEndDate('');
    } else if (dateStr < customStartDate) {
      setCustomStartDate(dateStr);
    } else {
      setCustomEndDate(dateStr);
    }
  };

  const daysInMonthGrid = useMemo(() => {
    const year = pickerMonth.getFullYear();
    const month = pickerMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      days.push(`${year}-${monthStr}-${dayStr}`);
    }
    return days;
  }, [pickerMonth]);

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
    let peak = -Infinity;
    let trough = Infinity;
    
    const equityCurve = chronoTrades.map((t, idx) => {
      const tradeR = getTradeR(t);
      running += tradeR;
      if (running > peak) peak = running;
      if (running < trough) trough = running;
      return {
        index: idx + 1,
        date: t.entryTime ? format(new Date(t.entryTime), 'MMM d') : '',
        equity: parseFloat(running.toFixed(2)),
        pnl: t.pnl,
        r: parseFloat(tradeR.toFixed(2)),
        symbol: t.symbol,
      };
    });

    const maxR = chronoTrades.length > 0 ? parseFloat(peak.toFixed(1)) : 0;
    const minR = chronoTrades.length > 0 ? parseFloat(trough.toFixed(1)) : 0;

    return { equityCurve, maxR, minR };
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

  // Redesign memo additions
  const weekDays = useMemo(() => {
    const refDate = new Date();
    refDate.setDate(refDate.getDate() + (weekOffset * 7));
    return getWeekDays(refDate);
  }, [weekOffset]);

  const weekDaysData = useMemo(() => {
    return weekDays.map(d => {
      const tradesOnDay = filteredTrades.filter(t => {
        const tDate = getTradeDate(t);
        return tDate && isSameDay(tDate, d);
      });
      const dayPnl = tradesOnDay.reduce((sum, t) => sum + t.pnl, 0);
      const dayPnlPct = startBalance > 0 ? (dayPnl / startBalance) * 100 : 0;
      return {
        date: d,
        pnl: dayPnl,
        pnlPct: dayPnlPct,
        count: tradesOnDay.length
      };
    });
  }, [weekDays, filteredTrades, startBalance]);

  const todayHighImpactNews = useMemo(() => {
    const today = new Date();
    let result = newsEvents.filter(e => {
      const isHigh = (e.impact || '').toLowerCase() === 'high';
      const eventDate = new Date(e.date);
      return isHigh && isSameDay(eventDate, today);
    });
    
    if (result.length === 0) {
      result = newsEvents
        .filter(e => (e.impact || '').toLowerCase() === 'high')
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .filter(e => new Date(e.date) >= new Date(today.setHours(0, 0, 0, 0)));
    }
    
    return result.slice(0, 4);
  }, [newsEvents]);

  const mostTradedAssets = useMemo(() => {
    const counts = {};
    filteredTrades.forEach(t => {
      const sym = (t.symbol || '').toUpperCase();
      if (!sym) return;
      counts[sym] = (counts[sym] || 0) + 1;
    });
    const sorted = Object.entries(counts)
      .map(([symbol, count]) => ({ symbol, count }))
      .sort((a, b) => b.count - a.count);
    while (sorted.length < 3) {
      sorted.push({ symbol: '—', count: 0 });
    }
    return sorted.slice(0, 3);
  }, [filteredTrades]);

  const breakevenTradesCount = useMemo(() => {
    return stats.totalTrades - stats.wins - stats.losses;
  }, [stats]);

  const pfBars = useMemo(() => {
    const totalWinVal = filteredTrades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
    const totalLossVal = Math.abs(filteredTrades.filter(t => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
    let numGreenBars = 14;
    if (totalWinVal + totalLossVal > 0) {
      const ratio = totalWinVal / (totalWinVal + totalLossVal);
      numGreenBars = Math.round(28 * ratio);
    }
    return {
      green: numGreenBars,
      red: 28 - numGreenBars,
      totalWinVal,
      totalLossVal
    };
  }, [filteredTrades]);

  const recentTrades = useMemo(() => {
    return [...filteredTrades].slice(0, 4);
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
            {p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)} ({p.r >= 0 ? '+' : ''}{p.r?.toFixed(2)}R)
          </span>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '4px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem' }}>Cumulative R:</span>
          <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: p.equity >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
            {p.equity >= 0 ? '+' : ''}{p.equity?.toFixed(2)}R
          </span>
        </div>
      </div>
    );
  };

  const BarTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const v = payload[0].value;
    const date = payload[0].payload.date;
    return (
      <div className="glass" style={{ padding: '8px 12px', fontSize: '0.75rem', border: '1px solid var(--border-strong)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '2px' }}>{date}</div>
        <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
          ${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>
    );
  };

  const BalanceTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <div className="glass" style={{ padding: '8px 12px', fontSize: '0.75rem', border: '1px solid var(--border-strong)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>Trade #{p.index} · {p.date}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s4)' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Balance</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
            ${p.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '4px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', gap: 'var(--s4)' }}>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem' }}>Trade P&L:</span>
          <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: p.pnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
            {p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="tz-dashboard-container">
      {/* Header Row */}
      <div className="tz-header">
        <div>
          <h1 className="tz-title">Welcome back, {user?.displayName || 'dharshan'}</h1>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'inherit' }}>
            {format(new Date(), 'eee dd MMM, yyyy')}
          </p>
        </div>
        
        {/* Filters */}
        <div className="tz-filters">
          <button 
            className="tz-filter-btn" 
            onClick={handlePnlModeToggle}
            style={{ padding: '6px 10px', minWidth: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={pnlDisplayMode === 'USD' ? 'Switch to Percentage Mode' : 'Switch to Dollar Mode'}
          >
            <span style={{ fontWeight: 700 }}>{pnlDisplayMode === 'USD' ? '$' : '%'}</span>
          </button>
          
          {(dateRange !== 'all' || selectedSymbol !== 'All' || selectedSetup !== 'All' || selectedType !== 'All' || selectedAccount !== 'All') && (
            <div className="tz-filter-btn">
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                {[dateRange !== 'all', selectedSymbol !== 'All', selectedSetup !== 'All', selectedType !== 'All', selectedAccount !== 'All'].filter(Boolean).length} filter{[dateRange !== 'all', selectedSymbol !== 'All', selectedSetup !== 'All', selectedType !== 'All', selectedAccount !== 'All'].filter(Boolean).length > 1 ? 's' : ''}
              </span>
              <button className="tz-filter-clear" onClick={handleResetFilters}>×</button>
            </div>
          )}
          
          <div className="tz-filter-btn" style={{ position: 'relative' }}>
            <select 
              value={dateRange} 
              onChange={e => {
                const val = e.target.value;
                setDateRange(val);
                if (val === 'custom') {
                  setShowCustomDatePicker(true);
                } else {
                  setShowCustomDatePicker(false);
                }
              }}
            >
              <option value="all">Date range</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="ytd">Year to Date</option>
              <option value="custom">Custom Date</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <div style={{ position: 'relative' }}>
              <button 
                className="tz-filter-btn" 
                onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  cursor: 'pointer', 
                  background: showCustomDatePicker ? 'var(--bg-active)' : 'var(--bg-secondary)', 
                  borderColor: showCustomDatePicker ? 'var(--accent)' : 'var(--border)',
                  padding: '5px 12px'
                }}
              >
                <Calendar size={13} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 600, fontSize: '0.72rem', color: 'var(--text-primary)' }}>
                  {customStartDate && customEndDate 
                    ? `${customStartDate} to ${customEndDate}` 
                    : customStartDate 
                      ? `From ${customStartDate}` 
                      : 'Select Calendar Range'}
                </span>
              </button>

              {/* Custom Interactive Visual Calendar Popover */}
              {showCustomDatePicker && (
                <div style={{
                  position: 'absolute',
                  top: '38px',
                  left: '0',
                  zIndex: 1000,
                  width: '280px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--r-lg)',
                  padding: '14px',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(16px)'
                }}>
                  {/* Calendar Header: Month + Prev/Next */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <button 
                      onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1))}
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      &lt;
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      {format(pickerMonth, 'MMMM yyyy')}
                    </span>
                    <button 
                      onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1))}
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      &gt;
                    </button>
                  </div>

                  {/* Days Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                  </div>

                  {/* Grid of Days */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                    {daysInMonthGrid.map((dayStr, idx) => {
                      if (!dayStr) return <div key={idx} />;
                      const dayNum = parseInt(dayStr.split('-')[2], 10);
                      const isStart = dayStr === customStartDate;
                      const isEnd = dayStr === customEndDate;
                      const inRange = customStartDate && customEndDate && dayStr > customStartDate && dayStr < customEndDate;

                      let bg = 'transparent';
                      let color = 'var(--text-primary)';
                      if (isStart || isEnd) {
                        bg = 'var(--accent)';
                        color = '#ffffff';
                      } else if (inRange) {
                        bg = 'var(--accent-soft)';
                        color = 'var(--accent)';
                      }

                      return (
                        <button
                          key={dayStr}
                          onClick={() => handleDateSelectInPicker(dayStr)}
                          style={{
                            background: bg,
                            color,
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 0',
                            fontSize: '0.7rem',
                            fontWeight: (isStart || isEnd) ? 700 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer controls */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', marginTop: '12px', paddingTop: '8px' }}>
                    <button 
                      onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }} 
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.68rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Clear dates
                    </button>
                    <button 
                      onClick={() => setShowCustomDatePicker(false)} 
                      style={{ background: 'var(--accent)', border: 'none', borderRadius: '4px', padding: '4px 12px', color: '#fff', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="tz-filter-btn">
            <select value={selectedAccount} onChange={e => handleAccountChange(e.target.value)}>
              <option value="All">All accounts</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.accountName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Resync Bar */}
      {!user?.isGuest ? (
        <div className="tz-resync-bar">
          <div>
            Last import: {trades.length > 0 && (trades[0].entryTime || trades[0].entry_time) ? format(new Date(trades[0].entryTime || trades[0].entry_time), 'MMM d, yyyy hh:mm a') : format(new Date(), 'MMM d, yyyy hh:mm a')}
            <span className="tz-resync-link" onClick={() => fetchTrades({ limit: 200 })}>Resync</span>
          </div>
          <button className="tz-btn-primary" onClick={() => fetchTrades({ limit: 200 })}>
            <Zap size={14} /> Start my day
          </button>
        </div>
      ) : (
        <div className="tz-resync-bar" style={{ justifyContent: 'flex-start' }}>
          <div>
            Last updated: {trades.length > 0 && (trades[0].entryTime || trades[0].entry_time) ? format(new Date(trades[0].entryTime || trades[0].entry_time), 'MMM d, yyyy hh:mm a') : format(new Date(), 'MMM d, yyyy hh:mm a')}
          </div>
        </div>
      )}

      {/* Weekly Performance Row (New Template) */}
      <div className="tz-card" style={{ padding: '16px', marginBottom: 'var(--s5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            <CalendarDays size={14} /> <span style={{ fontFamily: 'Georgia, serif' }}>Weekly Performance</span>
          </div>
          
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button 
              onClick={() => setWeekOffset(prev => prev - 1)}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              &lt;
            </button>
            <span style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '2px 8px', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {weekOffset === 0 ? 'Current Week' : weekOffset === -1 ? 'Last Week' : weekOffset === 1 ? 'Next Week' : `Week ${weekOffset > 0 ? '+' : ''}${weekOffset}`}
            </span>
            <button 
              onClick={() => setWeekOffset(prev => prev + 1)}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              &gt;
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
          {/* Summary Card */}
          <div style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', border: '1px solid var(--text-primary)', borderRadius: 'var(--r-md)', padding: '10px 12px', flex: 1, minWidth: '85px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <span style={{ fontSize: '0.55rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px', fontWeight: 600 }}>This</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'Georgia, serif' }}>Week</span>
          </div>
          
          {/* Days Cards */}
          {weekDaysData.map((day, idx) => {
            const isTodayDay = isSameDay(day.date, new Date());
            
            return (
              <div key={idx} style={{ background: isTodayDay ? 'var(--bg-active)' : 'var(--bg-primary)', border: `1px solid ${isTodayDay ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--r-md)', padding: '10px 12px', flex: 1, minWidth: '85px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}>
                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: 600 }}>{format(day.date, 'EEEE')}</span>
                
                <span style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '2px', fontFamily: 'Georgia, serif', color: day.count > 0 ? (day.pnl > 0 ? 'var(--profit)' : day.pnl < 0 ? 'var(--loss)' : 'var(--text-primary)') : 'var(--text-primary)' }}>
                  {day.count > 0 ? (
                    pnlDisplayMode === 'percent' ? (
                      `${day.pnlPct >= 0 ? '+' : ''}${day.pnlPct.toFixed(1)}%`
                    ) : (
                      `${day.pnl >= 0 ? '+' : ''}$${day.pnl.toFixed(0)}`
                    )
                  ) : format(day.date, 'MMM d')}
                </span>
                
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                  {day.count === 0 ? 'No trades' : `${day.count} trade${day.count !== 1 ? 's' : ''}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Redesigned Metrics Top Grid */}
      <div className="tz-dashboard-grid-top">
        {/* Column 1: Account Balance */}
        <div className="tz-balance-card">
          <div className="tz-balance-header">
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Account Balance</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--text-primary)', marginTop: '4px' }}>
                ${(startBalance + stats.totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>Last 30 Days</div>
            </div>
            <div className={`tz-balance-badge ${stats.totalPnL > 0 ? 'profit' : stats.totalPnL < 0 ? 'loss' : 'neutral'}`}>
              {startBalance > 0 ? (stats.totalPnL >= 0 ? '+' : '') : ''}
              {(startBalance > 0 ? (stats.totalPnL / startBalance) * 100 : 0).toFixed(2)}%
            </div>
          </div>
          
          <div style={{ width: '100%', height: '170px', overflow: 'hidden', marginTop: '16px' }}>
            {balanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={balanceData} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="tzBalanceRedesignGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--profit)" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="var(--profit)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="balance" stroke="var(--profit)" strokeWidth={2.2} fill="url(#tzBalanceRedesignGrad)" />
                  <Tooltip content={<BalanceTooltip />} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                No balance log history
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Performance Metrics (Winrate, Consistency, Avg Win/Loss) */}
        <div className="tz-grid-column-flex">
          {/* Top Card: Winrate & Consistency */}
          <div style={{ display: 'flex', gap: 'var(--s5)', flex: 1, minHeight: '135px' }}>
            {/* Trade Winrate */}
            <div className="tz-card tz-hoverable" style={{ flex: 1.3, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trade Winrate</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {stats.winRate.toFixed(0)}%
                  </div>
                </div>
                <div>
                  <svg width="40" height="40" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="12" fill="none" stroke="var(--border-strong)" strokeWidth="3" />
                    <circle cx="16" cy="16" r="12" fill="none"
                            stroke="var(--profit)"
                            strokeWidth="3"
                            strokeDasharray="75.4"
                            strokeDashoffset={75.4 * (1 - stats.winRate / 100)}
                            transform="rotate(-90 16 16)" />
                  </svg>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '4px', marginTop: '6px' }}>
                <div>Losses <strong style={{ color: 'var(--text-secondary)' }}>{stats.losses}</strong></div>
                <div>Wins <strong style={{ color: 'var(--profit)' }}>{stats.wins}</strong></div>
              </div>
            </div>

            {/* Consistency */}
            <div className="tz-card tz-hoverable" style={{ flex: 0.9, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '14px 16px' }}>
              <div className="tz-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span>CONSISTENCY</span>
                <Shield size={13} style={{ opacity: 0.6 }} />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>
                {Math.round(consistencyScore)}%
              </div>
            </div>
          </div>

          {/* Bottom Card: Full-width Dedicated AVG WIN / LOSS Card */}
          <div className="tz-card" style={{ flex: 1.1, minHeight: '135px', justifyContent: 'space-between', padding: '16px' }}>
            <div className="tz-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <span>AVG WIN / LOSS</span>
              <BarChart2 size={14} style={{ opacity: 0.6 }} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center', margin: '2px 0' }}>
              <div style={{ background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: 'var(--r-lg)', padding: '8px 12px' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>AVG WIN</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--profit)', marginTop: '2px' }}>
                  {stats.avgWin > 0 ? '+$'+parseFloat(stats.avgWin).toFixed(2) : '$0.00'}
                </div>
              </div>

              <div style={{ background: 'rgba(248, 113, 113, 0.08)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: 'var(--r-lg)', padding: '8px 12px' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>AVG LOSS</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--loss)', marginTop: '2px' }}>
                  {stats.avgLoss > 0 ? '-$'+parseFloat(stats.avgLoss).toFixed(2) : '$0.00'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '4px' }}>
              <span>Payoff Ratio (Avg Win / Avg Loss)</span>
              <strong style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono', fontSize: '0.75rem' }}>
                {stats.avgLoss > 0 ? (stats.avgWin / stats.avgLoss).toFixed(2) + 'x' : '—'}
              </strong>
            </div>
          </div>
        </div>

        {/* Column 3: SCORE & Total Trades / Profit Factor */}
        <div className="tz-grid-column-flex">
          {/* Top Card: SCORE */}
          <div className="tz-card" style={{ flex: 1.3, minHeight: '135px' }}>
            <div className="tz-card-header" style={{ marginBottom: '4px' }}>
              <div className="tz-card-title">
                <Brain size={14} /> SCORE
              </div>
            </div>
            <div className="tz-radar-container">
              {filteredTrades.length > 0 ? (
                <ResponsiveContainer width="100%" height={130}>
                  <RadarChart cx="50%" cy="50%" outerRadius="66%" data={radarData}>
                    <PolarGrid stroke="var(--border-mid)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 7 }} />
                    <Radar name="Score" dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                  Log trades to view score
                </div>
              )}
              
              <div className="tz-score-display" style={{ marginTop: '0px' }}>
                <div className="tz-score-label" style={{ fontSize: '0.62rem' }}>YOUR SCORE</div>
                <div className="tz-score-value" style={{ fontSize: '1.3rem', margin: '1px 0' }}>{scoreValue}</div>
                
                <div className="tz-score-bar-wrapper" style={{ marginTop: '2px' }}>
                  <div className="tz-score-bar-gradient" />
                  <div className="tz-score-bar-pin" style={{ left: `${scoreValue}%` }} />
                </div>
                
                <div className="tz-score-bar-ticks" style={{ fontSize: '0.6rem' }}>
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

          {/* Bottom Card: Total Trades & Profit Factor */}
          <div className="tz-card" style={{ flex: 1.1, minHeight: '135px', justifyContent: 'space-between', padding: '14px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', height: '100%' }}>
              {/* Total Trades */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Trades</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {stats.totalTrades}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                  <div className="tz-outcome-row">
                    <span className="tz-outcome-label" style={{ fontSize: '0.64rem' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--profit)', marginRight: '4px' }} />
                      Winning
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.68rem' }}>{stats.wins}</span>
                  </div>
                  <div className="tz-outcome-row">
                    <span className="tz-outcome-label" style={{ fontSize: '0.64rem' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text-muted)', marginRight: '4px' }} />
                      Breakeven
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.68rem' }}>{breakevenTradesCount}</span>
                  </div>
                  <div className="tz-outcome-row">
                    <span className="tz-outcome-label" style={{ fontSize: '0.64rem' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--loss)', marginRight: '4px' }} />
                      Losing
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.68rem' }}>{stats.losses}</span>
                  </div>
                </div>
              </div>

              {/* Profit Factor */}
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profit Factor</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {stats.profitFactor === 'Infinity' ? '—' : stats.profitFactor}
                  </div>
                </div>

                <div className="tz-pf-bars-container" style={{ margin: '4px 0', height: '16px' }}>
                  {[...Array(18)].map((_, idx) => {
                    const isWin = idx < Math.round((pfBars.green / 28) * 18);
                    return (
                      <div 
                        key={idx} 
                        className={`tz-pf-bar ${isWin ? 'win' : 'loss'}`} 
                      />
                    );
                  })}
                </div>

                <div style={{ fontSize: '0.64rem', display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px solid var(--border)', paddingTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Profit</span>
                    <span style={{ color: 'var(--profit)', fontWeight: 700 }}>+{startBalance > 0 ? ((pfBars.totalWinVal / startBalance) * 100).toFixed(1) : '0'}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Loss</span>
                    <span style={{ color: 'var(--loss)', fontWeight: 700 }}>-{startBalance > 0 ? ((pfBars.totalLossVal / startBalance) * 100).toFixed(1) : '0'}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Trades & High Impact News */}
      <div className="tz-dashboard-grid-bottom">
        {/* Recent Trades Table */}
        <div className="tz-card">
          <div className="tz-card-header">
            <div className="tz-card-title">
              <Activity size={14} /> RECENT TRADES
            </div>
          </div>
          
          <div className="tz-table-wrapper">
            {recentTrades.length > 0 ? (
              <table className="tz-table">
                <thead>
                  <tr>
                    <th>SYMBOL</th>
                    <th>CLOSE DATE</th>
                    <th style={{ textAlign: 'right' }}>NET P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((t, idx) => (
                    <tr key={t.id || idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: t.type === 'Long' ? 'var(--profit)' : 'var(--loss)',
                            boxShadow: `0 0 6px ${t.type === 'Long' ? 'var(--profit)' : 'var(--loss)'}`
                          }} />
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.symbol}</span>
                          <span style={{
                            fontSize: '0.62rem',
                            color: 'var(--text-secondary)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 500
                          }}>{t.type}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        {t.exitTime || t.exit_time ? format(new Date(t.exitTime || t.exit_time), 'MM/dd/yyyy') : (t.entryTime || t.entry_time ? format(new Date(t.entryTime || t.entry_time), 'MM/dd/yyyy') : '—')}
                      </td>
                      <td className={`tz-table-pnl ${t.pnl >= 0 ? 'profit' : 'loss'}`} style={{ fontWeight: 700, textAlign: 'right', fontFamily: 'JetBrains Mono' }}>
                        {t.pnl >= 0 ? '+' : '-'}${Math.abs(t.pnl).toFixed(2)}
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

        {/* High Impact News Feed Panel */}
        <div className="tz-card" style={{ minHeight: '340px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            <div>
              <div className="tz-card-title" style={{ fontSize: '0.85rem' }}>High Impact News</div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Today's upcoming high impact news</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ opacity: 0.8, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', cursor: 'pointer' }} title="Filter news">
                <Filter size={14} />
              </span>
              <Link to="/news" style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                See all &rarr;
              </Link>
            </div>
          </div>
          
          {newsLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
              Loading economic news...
            </div>
          ) : todayHighImpactNews.length > 0 ? (
            <div className="tz-news-list">
              {todayHighImpactNews.map((event, idx) => (
                <div key={event.id || idx} className="tz-news-row">
                  <div className="tz-news-info">
                    <img 
                      src={getFlagUrl(event.country)} 
                      alt={event.country} 
                      className="tz-news-flag"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <span className="tz-news-title">{event.title}</span>
                  </div>
                  <div className="tz-news-meta">
                    <span className="tz-news-countdown">{getCountdown(event.date)}</span>
                    <span className="tz-news-time">{getEventTime(event.date)}</span>
                    <span className="tz-news-stars">★★★</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '32px 0' }}>
              No upcoming high impact news today
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
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>DTG AI Coach</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Nemotron-70B Active</div>
                </div>
              </div>
              <button 
                onClick={() => setShowAiChat(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Chat Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-primary)' }}>
              {messages.map((msg, idx) => (
                <div 
                  key={idx}
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    gap: '4px'
                  }}
                >
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {msg.role === 'user' ? 'You' : 'DTG AI Coach'}
                  </div>
                  <div 
                    className="glass"
                    style={{
                      background: msg.role === 'user' ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                      border: msg.role === 'user' ? '1px solid var(--border-accent)' : '1px solid var(--border)',
                      borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      padding: '10px 14px',
                      color: 'var(--text-primary)',
                      fontSize: '0.78rem',
                      lineHeight: 1.5,
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {formatMessageContent(msg.content)}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600 }}>DTG AI Coach</div>
                  <div className="glass" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px 12px 12px 2px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="spinner-dots" style={{ display: 'flex', gap: '4px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', animation: 'bounce-dot 1.4s infinite ease-in-out both' }} />
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', animation: 'bounce-dot 1.4s infinite ease-in-out both 0.2s' }} />
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', animation: 'bounce-dot 1.4s infinite ease-in-out both 0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Suggestions Block */}
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={11} style={{ color: 'var(--accent)' }} /> Suggested Prompts
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
                placeholder="Ask DTG AI coach about your trades..."
                disabled={aiLoading}
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
    { path: '/rules',         icon: <ListTodo size={16}/>,        label: 'Trading Rules' },
    { path: '/journal',       icon: <BookOpen size={16}/>,        label: 'Journal' },
    { path: '/calendar',      icon: <CalendarDays size={16}/>,    label: 'Calendar' },
    { path: '/mondays',       icon: <CalendarDays size={16}/>,    label: "Monday's" },
    { path: '/news',          icon: <Newspaper size={16}/>,       label: 'News Feed' },
    { path: '/achievements',  icon: <Trophy size={16}/>,          label: 'Achievements' },
    { path: '/analytics',     icon: <BarChart2 size={16}/>,       label: 'Analytics' },
    { path: '/asset-allocation', icon: <PieChart size={16}/>,     label: 'Asset Allocation' },
    { path: '/psychology',    icon: <Brain size={16}/>,           label: 'Psychology' },
    { path: '/stoic',         icon: <Shield size={16}/>,          label: 'Stoic Mindset' },
    { path: '/ai-coach',      icon: <MessageSquare size={16}/>,   label: 'AI Coach' },
    { path: '/tradingview',   icon: <TrendingUp size={16}/>,      label: 'TV Analysis' },
    { path: '/mt5-connect',   icon: <Wifi size={16}/>,             label: 'MT5 Connect' },
    { path: '/tradovate',     icon: <Zap size={16}/>,             label: 'Tradovate Sync' },
    { path: '/daily-journal', icon: <NotebookPen size={16}/>,     label: 'Daily Notes' },
    { path: '/charts',        icon: <ImageIcon size={16}/>,       label: 'Charts' },
  ];

  const allowedPaths = user?.isGuest
    ? ['/dashboard', '/journal', '/calendar', '/analytics', '/asset-allocation']
    : null;

  const filteredNav = allowedPaths
    ? nav.filter(item => allowedPaths.includes(item.path))
    : nav;

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
            {filteredNav.map(item => (
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

          {!user?.isGuest && (
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
              <MotionLink
                to="/backup"
                className={`nav-item ${location.pathname === '/backup' ? 'active' : ''}`}
                variants={sidebarItemVariants}
              >
                <DatabaseIcon size={16}/>
                <span>Backup</span>
              </MotionLink>
            </div>
          )}
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
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get('accountId');
  const [accountName, setAccountName] = useState('');
  const [pnlDisplayMode, setPnlDisplayMode] = useState(() => {
    return localStorage.getItem('tz_pnl_display_mode') || 'percent';
  });

  useEffect(() => {
    const handlePnlModeChange = (e) => {
      setPnlDisplayMode(e.detail);
    };
    window.addEventListener('tz_pnl_display_mode_change', handlePnlModeChange);
    return () => window.removeEventListener('tz_pnl_display_mode_change', handlePnlModeChange);
  }, []);

  const togglePnlMode = () => {
    const newVal = pnlDisplayMode === 'USD' ? 'percent' : 'USD';
    setPnlDisplayMode(newVal);
    localStorage.setItem('tz_pnl_display_mode', newVal);
    window.dispatchEvent(new CustomEvent('tz_pnl_display_mode_change', { detail: newVal }));
  };

  useEffect(() => {
    const fetchAccountName = async () => {
      if (!accountId) {
        setAccountName('');
        return;
      }
      try {
        if (user?.isGuest) {
          if (String(accountId) === '1') {
            setAccountName('25K Funded Futures Family');
          } else if (String(accountId) === '2') {
            setAccountName('50K Apex Challenge Passed');
          } else if (String(accountId) === '3') {
            setAccountName('10K MyForexFunds Failed');
          } else {
            setAccountName(`Account ${accountId}`);
          }
        } else {
          const data = await accountsApi.list();
          const acc = data?.find(a => String(a.id) === String(accountId));
          if (acc) {
            setAccountName(acc.accountName);
          } else {
            setAccountName(`Account ${accountId}`);
          }
        }
      } catch (err) {
        console.error('Failed to load account in header:', err);
      }
    };
    fetchAccountName();
  }, [accountId, user]);

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
    '/mondays': "Monday's",
    '/news': 'News Feed', '/stoic': 'Stoic Mindset',
    '/analytics': 'Analytics', '/asset-allocation': 'Asset Allocation', '/psychology': 'Psychology',
    '/daily-journal': 'Daily Notes', '/charts': 'Charts', '/settings': 'Settings',
    '/tradingview': 'TradingView Analysis', '/ai-coach': 'AI Coach',
    '/mt5-connect': 'MT5 Connect',
    '/tradovate': 'Tradovate Connect',
    '/accounts': 'Trading Accounts',
    '/achievements': 'Achievements Wall',
    '/rules': 'Trading Rules Playbook',
  };

  const themeList = [
    { id: 'dark', name: 'Dark Theme', icon: <Moon size={13} />, bg: '#0a0b0f', accent: '#818cf8' },
    { id: 'minimal', name: 'Minimalist', icon: <Palette size={13} />, bg: '#ffffff', accent: '#000000' },
    { id: 'claymorphism', name: 'Claymorphism', icon: <Paintbrush size={13} />, bg: '#edf2f7', accent: '#6366f1' },
    { id: 'emerald-dark', name: 'Emerald Dark', icon: <Moon size={13} />, bg: '#0c0d10', accent: '#10B981' },
    { id: 'chill-white', name: 'Chill White', icon: <SunDim size={13} />, bg: '#FFF9FA', accent: '#FD1843' },
  ];

  const currentThemeObj = themeList.find(t => t.id === theme) || themeList[0];

  return (
    <header className="header">
      <div className="header-breadcrumb">
        <button className="mobile-menu-toggle" onClick={onMenuToggle} aria-label="Toggle menu" title="Toggle Navigation Menu">
          <Menu size={15} />
          <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Menu</span>
        </button>
        <span>{accountName || 'Trading Journal'}</span>
        <span className="header-sep">&gt;</span>
        <strong>{pageNames[location.pathname] || 'Page'}</strong>
      </div>
      <div className="header-right" style={{ gap: 'var(--s3)', position: 'relative', alignItems: 'center' }}>
        {/* Dollar vs Percentage display mode toggle */}
        <button
          onClick={togglePnlMode}
          style={{
            width: '30px',
            height: '30px',
            borderRadius: 'var(--r-sm)',
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '0.75rem'
          }}
          title={pnlDisplayMode === 'USD' ? 'Switch to Percentage Mode' : 'Switch to Dollar Mode'}
        >
          {pnlDisplayMode === 'USD' ? '$' : '%'}
        </button>

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
  const isPublicRoute = 
    (location.pathname.startsWith('/shared/') && !location.pathname.startsWith('/shared/dashboard/')) ||
    location.pathname === '/orbis-nft' ||
    location.pathname === '/nft';

  if (isPublicRoute) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
        {cursorEffect && <CustomCursor />}
        <Routes>
          <Route path="/shared/trade/:token" element={<SharedTrade />} />
          <Route path="/orbis-nft" element={<OrbisNft />} />
          <Route path="/nft" element={<OrbisNft />} />
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
            {user?.isGuest ? (
              <>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/shared/dashboard/:token" element={<Dashboard />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/asset-allocation" element={<AssetAllocation />} />
              </>
            ) : (
              <>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/shared/dashboard/:token" element={<Dashboard />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/news" element={<News />} />
                <Route path="/stoic" element={<Stoic />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/asset-allocation" element={<AssetAllocation />} />
                <Route path="/psychology" element={<Emotions />} />
                <Route path="/ai-coach" element={<AiCoach />} />
                <Route path="/tradingview" element={<TradingViewPage />} />
                <Route path="/mt5-connect" element={<MT5Connect />} />
                <Route path="/tradovate" element={<TradovateConnect />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/rules" element={<TradingRules />} />
                <Route path="/daily-journal" element={<DailyJournal />} />
                <Route path="/charts" element={<Charts />} />
                <Route path="/mondays" element={<Mondays />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/backup" element={<Backup />} />
              </>
            )}
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
