import React, { useState, useEffect, useMemo } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, TrendingUp, TrendingDown, Target, Wallet, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { toNewYorkDateString, formatInNewYork } from '../utils/timezone';
import { accounts as accountsApi, ai } from '../services/api';

// --- Animated Count-Up Number Helper ---
const AnimatedNumber = ({ value, prefix = '', suffix = '', decimals = 2, duration = 800 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const endValue = parseFloat(value) || 0;
    
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(easedProgress * endValue);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    
    requestAnimationFrame(step);
  }, [value, duration]);

  const numVal = parseFloat(value) || 0;
  const isNeg = numVal < 0;

  return (
    <span>
      {isNeg ? '-' : ''}{prefix}{Math.abs(displayValue).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
};

// --- Motion Variants for Smooth Staggered Animations ---
const gridVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.015,
      delayChildren: 0.03,
    }
  }
};

const cellVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 380,
      damping: 26,
    }
  }
};

const CalendarPage = () => {
  const { analytics, fetchAnalytics, trades, fetchTrades, loading } = useTrades();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('All');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [weeklyAnalysis, setWeeklyAnalysis] = useState(null);

  useEffect(() => {
    fetchAnalytics();
    fetchTrades({ limit: 1000 });
    const loadAccounts = async () => {
      try {
        const data = await accountsApi.list();
        setAccounts(data || []);
      } catch (err) {
        console.error('Failed to load accounts:', err);
      }
    };
    loadAccounts();
  }, [fetchAnalytics, fetchTrades]);

  const filteredTrades = useMemo(() => {
    const baseTrades = trades || [];
    if (selectedAccountId === 'All') return baseTrades;
    const targetId = parseInt(selectedAccountId);
    return baseTrades.filter(t => {
      if (targetId === 1) {
        return t.accountId === 1 || !t.accountId;
      }
      return t.accountId === targetId;
    });
  }, [trades, selectedAccountId]);

  // Auto-select the latest date with trades on page load
  useEffect(() => {
    if (!selectedDate && filteredTrades.length > 0) {
      const datesWithTrades = filteredTrades
        .map(t => {
          const entryTime = t.entryTime || t.entry_time || t.date || t.createdAt;
          return entryTime ? toNewYorkDateString(entryTime) : '';
        })
        .filter(Boolean)
        .sort((a, b) => b.localeCompare(a));

      if (datesWithTrades.length > 0) {
        const latestDateStr = datesWithTrades[0];
        const [year, month, day] = latestDateStr.split('-').map(Number);
        const latestDate = new Date(year, month - 1, day);
        setSelectedDate(latestDate);
        setCurrentMonth(latestDate);
      } else {
        setSelectedDate(new Date());
      }
    }
  }, [filteredTrades, selectedDate]);

  const dailyData = useMemo(() => {
    const daily = {};
    filteredTrades.forEach(t => {
      if (!t.entryTime) return;
      const dateStr = toNewYorkDateString(t.entryTime);
      if (!daily[dateStr]) {
        daily[dateStr] = { pnl: 0, count: 0, wins: 0, losses: 0 };
      }
      daily[dateStr].pnl += t.pnl || 0;
      daily[dateStr].count += 1;
      if (t.pnl > 0) daily[dateStr].wins += 1;
      else if (t.pnl < 0) daily[dateStr].losses += 1;
    });
    return daily;
  }, [filteredTrades]);

  // Generate calendar grid (starting on Sunday)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // Calculate weekly total for a Saturday (Sunday to Saturday)
  const getWeekTotal = (saturdayDate) => {
    let totalPnL = 0;
    let totalCount = 0;
    for (let i = 0; i < 7; i++) {
      const day = addDays(saturdayDate, -6 + i);
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayData = dailyData[dateStr];
      if (dayData) {
        totalPnL += dayData.pnl;
        totalCount += dayData.count;
      }
    }
    return { pnl: totalPnL, count: totalCount };
  };

  const getWeekTrades = (saturdayDate) => {
    const weekTrades = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(saturdayDate, -6 + i);
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayTrades = filteredTrades.filter(t => t.entryTime && toNewYorkDateString(t.entryTime) === dateStr);
      weekTrades.push(...dayTrades);
    }
    return weekTrades;
  };

  const handleAnalyzeWeek = async (saturdayDate) => {
    try {
      setIsAnalyzing(true);
      setWeeklyAnalysis(null);
      const weekTrades = getWeekTrades(saturdayDate);
      const res = await ai.analyzeWeek({ trades: weekTrades });
      setWeeklyAnalysis(res.content);
    } catch (err) {
      console.error(err);
      setWeeklyAnalysis('Failed to analyze the week.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Get trades for selected date
  const selectedDateTrades = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return filteredTrades.filter(t => {
      const entryTime = t.entryTime || t.entry_time || t.date || t.createdAt;
      return entryTime && toNewYorkDateString(entryTime) === dateStr;
    });
  }, [selectedDate, filteredTrades]);

  // Monthly summary
  const monthlySummary = useMemo(() => {
    const monthKey = format(currentMonth, 'yyyy-MM');
    let pnl = 0, tradeCount = 0, winDays = 0, lossDays = 0;
    Object.entries(dailyData).forEach(([date, d]) => {
      if (date.startsWith(monthKey)) {
        pnl += d.pnl;
        tradeCount += d.count;
        if (d.pnl > 0) winDays++;
        else if (d.pnl < 0) lossDays++;
      }
    });
    return { pnl, tradeCount, winDays, lossDays };
  }, [dailyData, currentMonth]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const gridVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.012
      }
    }
  };

  const cellVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 10 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 25 } }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="page-header" style={{ marginBottom: 'var(--s2)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s3)' }}>
        <div>
          <div className="page-title" style={{ margin: 0, fontSize: '1.25rem' }}><CalendarDays size={18} style={{ opacity: 0.6 }}/> Calendar</div>
          <div className="page-subtitle">Monthly P&L overview</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
          {/* Account Selector Dropdown */}
          <div className="tz-filter-btn" style={{ height: '34px', padding: '0 12px', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)' }}>
            <Wallet size={13} style={{ color: 'var(--accent)' }} />
            <select 
              value={selectedAccountId} 
              onChange={e => setSelectedAccountId(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                paddingRight: '4px',
                height: '100%',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <option value="All" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>All Accounts</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>{acc.accountName}</option>
              ))}
            </select>
          </div>

          {/* Compact Month Navigation in Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', background: 'var(--surface-glass)', padding: '4px 8px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', height: '34px' }}>
            <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} className="btn btn-ghost" style={{ padding: '4px', minHeight: 'auto', height: '24px', width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft size={14}/>
            </motion.button>
            <span style={{ fontWeight: 700, fontSize: '0.82rem', minWidth: 90, textAlign: 'center', color: 'var(--text-primary)' }}>
              {format(currentMonth, 'MMM yyyy')}
            </span>
            <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} className="btn btn-ghost" style={{ padding: '4px', minHeight: 'auto', height: '24px', width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight size={14}/>
            </motion.button>
          </div>
        </div>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
        {/* Calendar Card Container */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }} className="glass" style={{ padding: 'var(--s4)' }}>
          {/* Compact Inline Stats Header */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--s4)', paddingBottom: 'var(--s3)', marginBottom: 'var(--s4)', borderBottom: '1px solid var(--border)', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Net P&L:</span>
              <span style={{ fontWeight: 700, color: monthlySummary.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono, monospace' }}>
                {monthlySummary.pnl >= 0 ? '+' : ''}${Math.abs(monthlySummary.pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span style={{ color: 'var(--border)', userSelect: 'none' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Trades:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                {monthlySummary.tradeCount}
              </span>
            </div>
            <span style={{ color: 'var(--border)', userSelect: 'none' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <TrendingUp size={11} style={{ color: 'var(--profit)' }}/> Green:
              </span>
              <span style={{ fontWeight: 600, color: 'var(--profit)', fontFamily: 'JetBrains Mono, monospace' }}>
                {monthlySummary.winDays}d
              </span>
            </div>
            <span style={{ color: 'var(--border)', userSelect: 'none' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <TrendingDown size={11} style={{ color: 'var(--loss)' }}/> Red:
              </span>
              <span style={{ fontWeight: 600, color: 'var(--loss)', fontFamily: 'JetBrains Mono, monospace' }}>
                {monthlySummary.lossDays}d
              </span>
            </div>
          </div>

          {/* Weekday Headers */}
          {/* Weekday Headers */}
          <div className="calendar-grid">
            {weekDays.map(d => (
              <div key={d} className="calendar-header-cell">{d}</div>
            ))}

            {/* Day Cells */}
            {calendarDays.map((day, i) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayData = dailyData[dateStr];
              const inMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const today = isToday(day);

              const isSaturday = day.getDay() === 6;
              const weekTotal = isSaturday ? getWeekTotal(day) : null;
              
              const hasData = isSaturday 
                ? (weekTotal && weekTotal.count > 0)
                : (dayData && dayData.count > 0);

              const pnlValue = isSaturday ? weekTotal.pnl : (dayData ? dayData.pnl : 0);
              const countValue = isSaturday ? weekTotal.count : (dayData ? dayData.count : 0);

              const isProfit = hasData && pnlValue > 0;
              const isLoss = hasData && pnlValue < 0;

              return (
                <div
                  key={i}
                  className={`calendar-cell ${!inMonth ? 'empty' : ''} ${today ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isSaturday ? 'week-total-cell' : ''} ${hasData ? 'has-data' : ''} ${isProfit ? 'profit-day' : ''} ${isLoss ? 'loss-day' : ''}`}
                  onClick={() => {
                    if (inMonth) {
                      setSelectedDate(isSelected ? null : day);
                      setWeeklyAnalysis(null);
                    }
                  }}
                >
                  <div className="calendar-day" style={{ color: !inMonth ? 'var(--text-muted)' : today ? 'var(--accent)' : 'var(--text-primary)', fontWeight: !inMonth ? 500 : 700 }}>
                    {format(day, 'dd')}
                  </div>
                  
                  {isSaturday && (
                    <div className="calendar-week-total-label">
                      Week Total
                    </div>
                  )}

                  {hasData && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '100%' }}>
                      <div className="calendar-pnl" style={{ color: pnlValue >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                        {pnlValue >= 0 ? '+' : ''}${pnlValue.toFixed(2)}
                      </div>
                      <div className="calendar-trades">{countValue} trade{countValue !== 1 ? 's' : ''}</div>
                    </div>
                  )}
                  
                  {isSaturday && !hasData && (
                    <div className="calendar-week-total-empty">
                      <div className="calendar-pnl">$0.00</div>
                      <div className="calendar-trades">0 trades</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Day Detail Panel */}
        <AnimatePresence mode="wait">
          {selectedDate && (
            <motion.div
              key={format(selectedDate, 'yyyy-MM-dd')}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="glass"
              style={{ padding: 'var(--s5)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Trades for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </div>
              </div>
              {(() => {
                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                const dayData = dailyData[dateStr];
                const isSaturday = selectedDate.getDay() === 6;
                const weekTotal = isSaturday ? getWeekTotal(selectedDate) : null;

                const renderTradeCard = (t, i) => {
                  const pnlVal = parseFloat(t.pnl) || 0;
                  const pnlFormatted = pnlVal > 0 ? `+$${pnlVal.toFixed(2)}` : pnlVal < 0 ? `-$${Math.abs(pnlVal).toFixed(2)}` : `$0.00`;
                  const accountObj = accounts.find(a => String(a.id) === String(t.accountId));
                  const accountName = accountObj?.accountName || '';
                  
                  const entryTimeFormatted = t.entryTime ? formatInNewYork(t.entryTime, 'hh:mm a') : '';
                  const exitTimeFormatted = t.exitTime ? formatInNewYork(t.exitTime, 'hh:mm a') : '';
                  const timeRange = entryTimeFormatted ? (exitTimeFormatted ? `${entryTimeFormatted} → ${exitTimeFormatted}` : entryTimeFormatted) : null;
                  
                  const entryPrice = t.entryPrice !== undefined && t.entryPrice !== null && t.entryPrice !== '' ? t.entryPrice : null;
                  const exitPrice = t.exitPrice !== undefined && t.exitPrice !== null && t.exitPrice !== '' ? t.exitPrice : null;
                  const priceRange = (entryPrice || exitPrice) ? `${entryPrice || '—'} → ${exitPrice || '—'}` : null;
                  
                  const lotSize = t.lotSize ? `${t.lotSize} ${parseFloat(t.lotSize) === 1 ? 'lot' : 'lots'}` : null;
                  const rrGradeParts = [];
                  if (t.riskRewardRatio) rrGradeParts.push(`${t.riskRewardRatio}R`);
                  if (t.grade) rrGradeParts.push(`Grade ${t.grade}`);
                  const rrGradeStr = rrGradeParts.length > 0 ? rrGradeParts.join(' · ') : null;

                  const rawTags = t.tags;
                  const tagsList = Array.isArray(rawTags) ? rawTags : (typeof rawTags === 'string' && rawTags ? rawTags.split(',').map(s => s.trim()).filter(Boolean) : []);

                  return (
                    <div 
                      key={t.id || i}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        padding: '12px 14px',
                        background: 'var(--surface-glass)',
                        borderRadius: 'var(--r-md)',
                        border: '1px solid var(--border)',
                        fontSize: '0.78rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Header Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span 
                            className={`badge ${t.type === 'Long' ? 'badge-profit' : 'badge-loss'}`} 
                            style={{ fontSize: '0.6rem', padding: '2px 8px', fontWeight: 700, letterSpacing: '0.04em' }}
                          >
                            {t.type === 'Long' ? 'LONG ↑' : 'SHORT ↓'}
                          </span>
                          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                            {t.symbol}
                          </span>
                          {accountName && (
                            <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'var(--surface-glass-h)', borderRadius: '4px', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                              {accountName}
                            </span>
                          )}
                        </div>
                        <span style={{ fontWeight: 800, color: pnlVal > 0 ? 'var(--profit)' : pnlVal < 0 ? 'var(--loss)' : 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.95rem' }}>
                          {pnlFormatted}
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
                        gap: '6px 12px', 
                        padding: '8px 10px', 
                        background: 'var(--surface-glass)', 
                        borderRadius: '6px', 
                        border: '1px solid var(--border)' 
                      }}>
                        {priceRange && (
                          <div>
                            <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>Price (Entry → Exit)</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{priceRange}</span>
                          </div>
                        )}
                        {timeRange && (
                          <div>
                            <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>Time (NY)</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{timeRange}</span>
                          </div>
                        )}
                        {lotSize && (
                          <div>
                            <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>Size</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lotSize}</span>
                          </div>
                        )}
                        {rrGradeStr && (
                          <div>
                            <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>R/R & Grade</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rrGradeStr}</span>
                          </div>
                        )}
                        {t.setup && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>Setup</span>
                            <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{t.setup}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer: Tags and Notes */}
                      {(tagsList.length > 0 || t.notes) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
                          {tagsList.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {tagsList.map((tag, idx) => (
                                <span key={idx} style={{ fontSize: '0.6rem', padding: '1px 6px', background: 'var(--surface-glass)', borderRadius: '4px', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {t.notes && (
                            <div style={{ fontSize: '0.7rem', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                              "{t.notes}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                };
                
                if (isSaturday) {
                   return (
                     <>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s3)', flexWrap: 'wrap', gap: 'var(--s3)' }}>
                         <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                           Weekly Summary (Sun - Sat)
                         </div>
                         <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn" style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 12px', fontSize: '0.75rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer' }} onClick={() => handleAnalyzeWeek(selectedDate)} disabled={isAnalyzing}>
                           <Sparkles size={14} />
                           {isAnalyzing ? 'Analyzing...' : 'AI Weekly Analysis'}
                         </motion.button>
                       </div>
                       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--s3)', marginBottom: 'var(--s4)', maxWidth: '400px' }}>
                         <div style={{ padding: '8px var(--s4)', background: 'var(--surface-glass)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                           <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Week Total P&L</div>
                           <div style={{ fontSize: '1.05rem', fontWeight: 700, color: weekTotal.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                             <AnimatedNumber value={weekTotal.pnl} prefix={weekTotal.pnl >= 0 ? '+' : ''} decimals={2} />
                           </div>
                         </div>
                         <div style={{ padding: '8px var(--s4)', background: 'var(--surface-glass)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                           <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Week Trades Count</div>
                           <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                             <AnimatedNumber value={weekTotal.count} decimals={0} />
                           </div>
                         </div>
                       </div>
                       
                       {weeklyAnalysis && (
                          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass" style={{ padding: 'var(--s4)', marginBottom: 'var(--s4)', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--s3)', color: '#6366f1', fontWeight: 600 }}>
                              <Sparkles size={16} /> AI Coach Analysis
                            </div>
                            <div style={{ fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                              {weeklyAnalysis}
                            </div>
                          </motion.div>
                       )}

                       {dayData && dayData.count > 0 && (
                         <>
                           <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--s3)', marginTop: 'var(--s4)' }}>
                             Saturday Trade Details
                           </div>
                           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--s3)' }}>
                             {selectedDateTrades.map((t, i) => renderTradeCard(t, i))}
                           </div>
                         </>
                       )}
                     </>
                   );
                }

                if (!dayData) {
                  return <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', padding: 'var(--s3) 0' }}>No trades on this day</div>;
                }

                const dayTotalPnl = selectedDateTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);
                const dayWins = selectedDateTrades.filter(t => (parseFloat(t.pnl) || 0) > 0).length;
                const dayLosses = selectedDateTrades.filter(t => (parseFloat(t.pnl) || 0) < 0).length;
                const dayWinRate = selectedDateTrades.length > 0 ? ((dayWins / selectedDateTrades.length) * 100).toFixed(0) : '0';
                const dayAvgPnl = selectedDateTrades.length > 0 ? dayTotalPnl / selectedDateTrades.length : 0;

                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
                      <div style={{ padding: '8px var(--s4)', background: 'var(--surface-glass)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Total P&L</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: dayTotalPnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                          <AnimatedNumber value={dayTotalPnl} prefix={dayTotalPnl >= 0 ? '+' : ''} decimals={2} />
                        </div>
                      </div>
                      <div style={{ padding: '8px var(--s4)', background: 'var(--surface-glass)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Trades Count</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                          <AnimatedNumber value={selectedDateTrades.length} decimals={0} /> <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({dayWins}W / {dayLosses}L)</span>
                        </div>
                      </div>
                      <div style={{ padding: '8px var(--s4)', background: 'var(--surface-glass)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Win Rate</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: parseInt(dayWinRate) >= 50 ? 'var(--profit)' : 'var(--text-primary)' }}>
                          <AnimatedNumber value={dayWinRate} suffix="%" decimals={0} />
                        </div>
                      </div>
                      <div style={{ padding: '8px var(--s4)', background: 'var(--surface-glass)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Avg Trade</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: dayAvgPnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                          <AnimatedNumber value={dayAvgPnl} prefix={dayAvgPnl >= 0 ? '+' : ''} decimals={2} />
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--s3)' }}>
                      Trade Details
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--s3)' }}>
                      {selectedDateTrades.map((t, i) => renderTradeCard(t, i))}
                      {selectedDateTrades.length === 0 && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Trade details loading...</div>
                      )}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default CalendarPage;
