import React, { useState, useEffect, useMemo } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, TrendingUp, TrendingDown, Target } from 'lucide-react';

const CalendarPage = () => {
  const { analytics, fetchAnalytics, trades, fetchTrades, loading } = useTrades();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetchAnalytics();
    fetchTrades({ limit: 500 });
  }, [fetchAnalytics, fetchTrades]);

  const dailyData = analytics?.daily || {};

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // Get trades for selected date
  const selectedDateTrades = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return trades.filter(t => t.entryTime && t.entryTime.startsWith(dateStr));
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

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
      <div className="page-header">
        <div className="page-title"><CalendarDays size={18} style={{ opacity: 0.6 }}/> Calendar</div>
        <div className="page-subtitle">Monthly P&L overview</div>
      </div>

      {/* Monthly Summary */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Monthly P&L', val: `${monthlySummary.pnl >= 0 ? '+' : ''}$${Math.abs(monthlySummary.pnl).toFixed(2)}`, col: monthlySummary.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', icon: <TrendingUp size={13}/> },
          { label: 'Trades', val: monthlySummary.tradeCount, col: 'var(--text-primary)', icon: <Target size={13}/> },
          { label: 'Green Days', val: monthlySummary.winDays, col: 'var(--profit)', icon: <TrendingUp size={13}/> },
          { label: 'Red Days', val: monthlySummary.lossDays, col: 'var(--loss)', icon: <TrendingDown size={13}/> },
        ].map((s, i) => (
          <div key={s.label} className={`glass glass-hover stat-card anim-fade-up delay-${i+1}`}>
            <div className="stat-label"><span style={{ color: s.col }}>{s.icon}</span> {s.label}</div>
            <div className="stat-value" style={{ color: s.col }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDate ? '1fr 340px' : '1fr', gap: 'var(--s5)' }}>
        {/* Calendar */}
        <div className="glass anim-fade-up delay-2" style={{ padding: 'var(--s5)' }}>
          {/* Month Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s5)' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft size={16}/>
            </button>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight size={16}/>
            </button>
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

              return (
                <div
                  key={i}
                  className={`calendar-cell ${!inMonth ? 'empty' : ''} ${today ? 'today' : ''} ${dayData ? 'has-data' : ''}`}
                  style={{
                    background: dayData ? getPnLColor(dayData.pnl) : undefined,
                    borderColor: isSelected ? 'var(--accent)' : undefined,
                    boxShadow: isSelected ? '0 0 12px var(--accent-glow)' : undefined,
                  }}
                  onClick={() => inMonth && setSelectedDate(isSelected ? null : day)}
                >
                  <div className="calendar-day" style={{ color: !inMonth ? 'var(--text-muted)' : today ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: today ? 700 : 500 }}>
                    {format(day, 'd')}
                  </div>
                  {dayData && inMonth && (
                    <>
                      <div className="calendar-pnl" style={{ color: dayData.pnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                        {dayData.pnl >= 0 ? '+' : ''}{dayData.pnl.toFixed(0)}
                      </div>
                      <div className="calendar-trades">{dayData.count} trade{dayData.count !== 1 ? 's' : ''}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Day Detail Panel */}
        {selectedDate && (
          <div className="glass anim-slide-r" style={{ padding: 'var(--s5)', alignSelf: 'start', position: 'sticky', top: 80 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 'var(--s2)' }}>
              {format(selectedDate, 'EEEE, MMMM d')}
            </div>
            {(() => {
              const dateStr = format(selectedDate, 'yyyy-MM-dd');
              const dayData = dailyData[dateStr];
              if (!dayData) {
                return <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', padding: 'var(--s4) 0' }}>No trades on this day</div>;
              }
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)', marginBottom: 'var(--s5)' }}>
                    <div style={{ padding: 'var(--s3)', background: 'var(--surface-glass)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>P&L</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: dayData.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                        {dayData.pnl >= 0 ? '+' : ''}${dayData.pnl.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ padding: 'var(--s3)', background: 'var(--surface-glass)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Trades</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                        {dayData.count}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--s3)' }}>
                    Trades
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                    {selectedDateTrades.map((t, i) => (
                      <div key={t.id || i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px var(--s3)', background: 'var(--surface-glass)',
                        borderRadius: 'var(--r-md)', border: '1px solid var(--border)',
                        fontSize: '0.78rem',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                          <span className={`badge ${t.type === 'Long' ? 'badge-profit' : 'badge-loss'}`} style={{ fontSize: '0.58rem' }}>{t.type}</span>
                          <span style={{ fontWeight: 600 }}>{t.symbol}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: t.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                          {t.pnl >= 0 ? '+' : ''}${Math.abs(t.pnl).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {selectedDateTrades.length === 0 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Trade details loading...</div>
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
