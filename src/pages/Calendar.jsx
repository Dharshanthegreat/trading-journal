import React, { useState, useEffect, useMemo } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, TrendingUp, TrendingDown, Target } from 'lucide-react';

import { toNewYorkDateString } from '../utils/timezone';

const CalendarPage = () => {
  const { analytics, fetchAnalytics, trades, fetchTrades, loading } = useTrades();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetchAnalytics();
    fetchTrades({ limit: 500 });
  }, [fetchAnalytics, fetchTrades]);

  const dailyData = useMemo(() => {
    const daily = {};
    trades.forEach(t => {
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
  }, [trades]);

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

  // Get trades for selected date
  const selectedDateTrades = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return trades.filter(t => t.entryTime && toNewYorkDateString(t.entryTime) === dateStr);
  }, [selectedDate, trades]);

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

  const getPnLColor = (pnl) => {
    if (pnl > 0) {
      const intensity = Math.min(pnl / 500, 1);
      return `rgba(52, 211, 153, ${0.1 + intensity * 0.35})`;
    } else if (pnl < 0) {
      const intensity = Math.min(Math.abs(pnl) / 500, 1);
      return `rgba(248, 113, 113, ${0.1 + intensity * 0.35})`;
    }
    return 'transparent';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
      <div className="page-header" style={{ marginBottom: 'var(--s2)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s3)' }}>
        <div>
          <div className="page-title" style={{ margin: 0, fontSize: '1.25rem' }}><CalendarDays size={18} style={{ opacity: 0.6 }}/> Calendar</div>
          <div className="page-subtitle">Monthly P&L overview</div>
        </div>

        {/* Compact Month Navigation in Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', background: 'var(--surface-glass)', padding: '4px 8px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
          <button className="btn btn-ghost" style={{ padding: '4px', minHeight: 'auto', height: '24px', width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft size={14}/>
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.82rem', minWidth: 90, textAlign: 'center', color: 'var(--text-primary)' }}>
            {format(currentMonth, 'MMM yyyy')}
          </span>
          <button className="btn btn-ghost" style={{ padding: '4px', minHeight: 'auto', height: '24px', width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight size={14}/>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDate ? '1fr 300px' : '1fr', gap: 'var(--s4)' }}>
        {/* Calendar */}
        <div className="glass anim-fade-up delay-1" style={{ padding: 'var(--s4)' }}>
          {/* Compact Inline Stats */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--s4)', paddingBottom: 'var(--s3)', marginBottom: 'var(--s4)', borderBottom: '1px solid var(--border)', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Net P&L:</span>
              <span style={{ fontWeight: 700, color: monthlySummary.pnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                {monthlySummary.pnl >= 0 ? '+' : ''}${monthlySummary.pnl.toFixed(2)}
              </span>
            </div>
            <span style={{ color: 'var(--border)', userSelect: 'none' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Trades:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{monthlySummary.tradeCount}</span>
            </div>
            <span style={{ color: 'var(--border)', userSelect: 'none' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <TrendingUp size={11} style={{ color: 'var(--profit)' }}/> Green:
              </span>
              <span style={{ fontWeight: 600, color: 'var(--profit)' }}>{monthlySummary.winDays}d</span>
            </div>
            <span style={{ color: 'var(--border)', userSelect: 'none' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <TrendingDown size={11} style={{ color: 'var(--loss)' }}/> Red:
              </span>
              <span style={{ fontWeight: 600, color: 'var(--loss)' }}>{monthlySummary.lossDays}d</span>
            </div>
          </div>

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

              return (
                <div
                  key={i}
                  className={`calendar-cell ${!inMonth ? 'empty' : ''} ${today ? 'today' : ''} ${isSaturday ? 'week-total-cell' : ''} ${hasData ? 'has-data' : ''}`}
                  style={{
                    background: hasData ? getPnLColor(pnlValue) : undefined,
                    borderColor: isSelected ? 'var(--accent)' : undefined,
                    boxShadow: isSelected ? '0 0 8px var(--accent-glow)' : undefined,
                  }}
                  onClick={() => inMonth && setSelectedDate(isSelected ? null : day)}
                >
                  <div className="calendar-day" style={{ color: !inMonth ? 'var(--text-muted)' : today ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: today ? 700 : 500 }}>
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
        </div>

        {/* Day Detail Panel */}
        {selectedDate && (
          <div className="glass anim-slide-r" style={{ padding: 'var(--s4)', alignSelf: 'start', position: 'sticky', top: 80 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s3)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                {format(selectedDate, 'EEE, MMM d, yyyy')}
              </div>
              <button 
                className="btn btn-ghost" 
                style={{ padding: 4, minHeight: 'auto', height: '20px', width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                onClick={() => setSelectedDate(null)}
              >
                <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>✕</span>
              </button>
            </div>
            {(() => {
              const dateStr = format(selectedDate, 'yyyy-MM-dd');
              const dayData = dailyData[dateStr];
              if (!dayData) {
                return <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', padding: 'var(--s3) 0' }}>No trades on this day</div>;
              }
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s2)', marginBottom: 'var(--s3)' }}>
                    <div style={{ padding: '6px var(--s3)', background: 'var(--surface-glass)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>P&L</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: dayData.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                        {dayData.pnl >= 0 ? '+' : ''}${dayData.pnl.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ padding: '6px var(--s3)', background: 'var(--surface-glass)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Trades</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                        {dayData.count}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--s2)' }}>
                    Trades
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                    {selectedDateTrades.map((t, i) => (
                      <div key={t.id || i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px var(--s3)', background: 'var(--surface-glass)',
                        borderRadius: 'var(--r-md)', border: '1px solid var(--border)',
                        fontSize: '0.75rem',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                          <span className={`badge ${t.type === 'Long' ? 'badge-profit' : 'badge-loss'}`} style={{ fontSize: '0.55rem', padding: '1px 4px' }}>{t.type}</span>
                          <span style={{ fontWeight: 600 }}>{t.symbol}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: t.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                          {t.pnl >= 0 ? '+' : ''}${Math.abs(t.pnl).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {selectedDateTrades.length === 0 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Trade details loading...</div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarPage;
