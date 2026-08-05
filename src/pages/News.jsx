import React, { useState, useEffect, useMemo } from 'react';
import { news as newsApi } from '../services/api';
import {
  Calendar, Globe, AlertCircle,
  Filter, ChevronLeft, ChevronRight, Newspaper,
  RefreshCw, X, Zap
} from 'lucide-react';

// Formatting helpers
const formatEventDate = (dateStr) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

const formatEventTime = (dateStr) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return 'All Day';
  }
};

const News = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [impactFilter, setImpactFilter] = useState('All');
  const [currencyFilter, setCurrencyFilter] = useState('All');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

  // Month navigation state
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-indexed

  // Event Detail Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Load economic calendar news for the selected month
  const loadNews = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await newsApi.list({ year: currentYear, month: currentMonth });
      setEvents(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch economic calendar news. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, [currentYear, currentMonth]);

  // Auto-select date when events load or when month changes
  useEffect(() => {
    if (events.length > 0) {
      const today = new Date();
      const todayStr = today.toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' });
      
      const hasSelectedDateInEvents = events.some(e => {
        const eDate = new Date(e.date).toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' });
        return eDate === selectedCalendarDate;
      });

      if (hasSelectedDateInEvents) return;

      const hasTodayInEvents = events.some(e => {
        const eDate = new Date(e.date).toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' });
        return eDate === todayStr;
      });

      if (hasTodayInEvents && today.getFullYear() === currentYear && today.getMonth() === currentMonth) {
        setSelectedCalendarDate(todayStr);
      } else {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const upcomingEvent = events.find(e => new Date(e.date) >= startOfToday);
        if (upcomingEvent) {
          const upcomingDateStr = new Date(upcomingEvent.date).toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' });
          setSelectedCalendarDate(upcomingDateStr);
        } else {
          const firstEventDate = new Date(events[0].date).toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' });
          setSelectedCalendarDate(firstEventDate);
        }
      }
    } else {
      setSelectedCalendarDate(null);
    }
  }, [events, currentYear, currentMonth]);

  // Derived Currency list for filtering
  const uniqueCurrencies = useMemo(() => {
    const currs = events.map(e => e.country?.toUpperCase()).filter(Boolean);
    return ['All', ...new Set(currs)].sort();
  }, [events]);

  // Filtered Events list
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (impactFilter !== 'All' && e.impact !== impactFilter) return false;
      if (currencyFilter !== 'All' && e.country?.toUpperCase() !== currencyFilter.toUpperCase()) return false;
      if (selectedCalendarDate) {
        const eDate = new Date(e.date).toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' });
        if (eDate !== selectedCalendarDate) return false;
      }
      return true;
    });
  }, [events, impactFilter, currencyFilter, selectedCalendarDate]);

  // Group events by date for timeline output
  const groupedEvents = useMemo(() => {
    const groups = {};
    filteredEvents.forEach(e => {
      const dateLabel = formatEventDate(e.date);
      if (!groups[dateLabel]) groups[dateLabel] = [];
      groups[dateLabel].push(e);
    });
    return Object.entries(groups);
  }, [filteredEvents]);

  // Monthly grid generator (42 cells)
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const cells = [];
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const d = new Date(currentYear, currentMonth - 1, dayNum);
      cells.push({
        date: d,
        dayNum,
        isCurrentMonth: false,
        dateKey: d.toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' })
      });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(currentYear, currentMonth, i);
      cells.push({
        date: d,
        dayNum: i,
        isCurrentMonth: true,
        dateKey: d.toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' })
      });
    }
    
    const totalCells = 42;
    const nextDaysCount = totalCells - cells.length;
    for (let i = 1; i <= nextDaysCount; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      cells.push({
        date: d,
        dayNum: i,
        isCurrentMonth: false,
        dateKey: d.toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' })
      });
    }
    
    return cells;
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
    setSelectedCalendarDate(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
    setSelectedCalendarDate(null);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getImpactColor = (impact) => {
    switch ((impact || '').toLowerCase()) {
      case 'high':
        return {
          main: '#f87171',
          soft: 'rgba(248, 113, 113, 0.12)',
          border: 'rgba(248, 113, 113, 0.3)',
        };
      case 'medium':
        return {
          main: '#f97316',
          soft: 'rgba(249, 115, 22, 0.12)',
          border: 'rgba(249, 115, 22, 0.3)',
        };
      case 'low':
        return {
          main: '#10b981',
          soft: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.3)',
        };
      case 'holiday':
      default:
        return {
          main: '#8a8a8a',
          soft: 'rgba(138, 138, 138, 0.12)',
          border: 'rgba(138, 138, 138, 0.3)',
        };
    }
  };

  return (
    <div style={{
      width: '100%',
      height: 'calc(100vh - 120px)',
      minHeight: '520px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Clean full-width economic calendar */}
      <div className="glass" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 'var(--r-lg)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)'
      }}>
        {/* Header and filters */}
        <div style={{
          padding: 'var(--s4)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--s3)',
          background: 'var(--bg-tertiary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'flex',
              padding: '6px',
              borderRadius: 'var(--r-sm)',
              background: 'var(--accent-soft)',
              color: 'var(--accent)'
            }}>
              <Newspaper size={15} />
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h2 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Economic Calendar</h2>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.52rem',
                  fontWeight: 700,
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981' }} />
                  Synced Locally
                </span>
              </div>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Forex Factory Economic Indicator Feeds</span>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-sm)', padding: '2px 8px' }}>
              <Filter size={12} style={{ color: 'var(--text-muted)' }} />
              <select 
                value={impactFilter}
                onChange={e => setImpactFilter(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.72rem', cursor: 'pointer', outline: 'none' }}
              >
                <option value="All">All Impact</option>
                <option value="High">High Impact Only</option>
                <option value="Medium">Medium Impact</option>
                <option value="Low">Low Impact</option>
                <option value="Holiday">Holidays</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-sm)', padding: '2px 8px' }}>
              <Globe size={12} style={{ color: 'var(--text-muted)' }} />
              <select 
                value={currencyFilter}
                onChange={e => setCurrencyFilter(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.72rem', cursor: 'pointer', outline: 'none' }}
              >
                {uniqueCurrencies.map(curr => (
                  <option key={curr} value={curr}>{curr === 'All' ? 'All Currencies' : curr}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={() => loadNews(true)}
              disabled={loading || refreshing}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-mid)',
                borderRadius: 'var(--r-sm)',
                padding: '5px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
              title="Refresh Calendar"
            >
              <RefreshCw size={12} className={refreshing ? 'spin-anim' : ''} />
            </button>
          </div>
        </div>

        {/* Calendar Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
          
          {/* Economic Calendar Date Selector Month Grid */}
          {!loading && !error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)', padding: 'var(--s3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              
              {/* Month Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <button 
                  onClick={handlePrevMonth}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '4px' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  {monthNames[currentMonth]} {currentYear}
                </strong>
                <button 
                  onClick={handleNextMonth}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '4px' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Weekday Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '4px' }}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayName, idx) => (
                  <span key={idx} style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)' }}>{dayName}</span>
                ))}
              </div>

              {/* Static Calendar Days Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {calendarDays.map((cell, idx) => {
                  const isSelected = selectedCalendarDate === cell.dateKey;
                  const isTodayCell = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' }) === cell.dateKey;
                  
                  const dayEvents = events.filter(e => {
                    const eDate = new Date(e.date).toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' });
                    return eDate === cell.dateKey;
                  });

                  const hasHigh = dayEvents.some(e => e.impact === 'High');
                  const hasMed = dayEvents.some(e => e.impact === 'Medium');
                  const hasLow = dayEvents.some(e => e.impact === 'Low');
                  const hasHoliday = dayEvents.some(e => e.impact === 'Holiday');

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedCalendarDate(cell.dateKey)}
                      style={{
                        height: '38px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--r-xs)',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--accent)' : (isTodayCell ? 'var(--accent-soft)' : 'transparent'),
                        border: isSelected ? '1px solid var(--accent)' : (isTodayCell ? '1px solid var(--border-accent)' : '1px solid transparent'),
                        color: isSelected ? '#fff' : (cell.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)'),
                        opacity: cell.isCurrentMonth ? 1 : 0.4,
                        position: 'relative',
                      }}
                    >
                      <span style={{ fontSize: '0.72rem', fontWeight: isTodayCell || isSelected ? 700 : 500 }}>
                        {cell.dayNum}
                      </span>

                      <div style={{ display: 'flex', gap: '2px', height: '4px', marginTop: '2px', alignItems: 'center' }}>
                        {hasHigh && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#f87171' }} />}
                        {hasMed && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#f97316' }} />}
                        {hasLow && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981' }} />}
                        {hasHoliday && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#8a8a8a' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '64px', width: '100%' }} />
              ))}
            </div>
          ) : error ? (
            <div style={{ padding: 'var(--s8) 0', textAlign: 'center', color: 'var(--loss)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={32} />
              <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{error}</div>
              <button className="btn btn-secondary btn-sm" onClick={() => loadNews()}>Try Again</button>
            </div>
          ) : groupedEvents.length === 0 ? (
            <div style={{ padding: 'var(--s10) 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div>No economic releases matching current filters or date.</div>
              {selectedCalendarDate && (
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setSelectedCalendarDate(null)}
                  style={{ fontSize: '0.72rem', marginTop: '4px' }}
                >
                  View All Releases For This Month
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
              {groupedEvents.map(([dateLabel, groupEvents]) => (
                <div key={dateLabel} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                  <div style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--accent)',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{dateLabel}</span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {groupEvents.length} economic events
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                    {groupEvents.map((ev, index) => {
                      const colors = getImpactColor(ev.impact);
                      const isSelected = selectedEvent && selectedEvent.title === ev.title && selectedEvent.date === ev.date;
                      return (
                        <div
                          key={index}
                          onClick={() => setSelectedEvent(ev === selectedEvent ? null : ev)}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '80px 70px 1fr 180px',
                            alignItems: 'center',
                            padding: 'var(--s3) var(--s4)',
                            borderRadius: 'var(--r-md)',
                            border: '1px solid',
                            borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                            background: isSelected ? 'var(--accent-soft)' : 'var(--bg-tertiary)',
                            cursor: 'pointer',
                          }}
                          className="news-event-row"
                        >
                          {/* Time */}
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500, fontFamily: 'JetBrains Mono' }}>
                            {formatEventTime(ev.date)}
                          </span>

                          {/* Country / Currency */}
                          <div>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--border-mid)',
                              borderRadius: '4px',
                              padding: '2px 6px'
                            }}>
                              {ev.country}
                            </span>
                          </div>

                          {/* News Title & Impact Badge */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {ev.title}
                            </span>
                            <span style={{
                              background: colors.soft,
                              color: colors.main,
                              border: `1px solid ${colors.border}`,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '0.55rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.02em'
                            }}>
                              {ev.impact}
                            </span>
                          </div>

                          {/* Forecast & Previous */}
                          <div style={{ display: 'flex', gap: 'var(--s4)', justifyContent: 'flex-end', fontSize: '0.7rem' }}>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.58rem', textTransform: 'uppercase' }}>Forecast</span>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{ev.forecast || '—'}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.58rem', textTransform: 'uppercase' }}>Previous</span>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{ev.previous || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '6px', color: 'var(--text-muted)' }}>
                              <ChevronRight size={14} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div
            className="glass-deep modal-panel"
            style={{ maxWidth: '480px', padding: 'var(--s6)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--s4)' }}>
              <div>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {selectedEvent.country} · {formatEventTime(selectedEvent.date)}
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                  {selectedEvent.title}
                </h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--s3)', marginBottom: 'var(--s5)' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s3)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Impact</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: getImpactColor(selectedEvent.impact).main, marginTop: 2 }}>{selectedEvent.impact}</div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s3)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Forecast</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{selectedEvent.forecast || '—'}</div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s3)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Previous</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary)', marginTop: 2 }}>{selectedEvent.previous || '—'}</div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={14} style={{ color: 'var(--accent)' }} /> Expected Market Volatility
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {selectedEvent.impact === 'High' 
                  ? 'High volatility release. Expect sharp spread widening, potential slippage, and rapid 30-50+ tick repricing across related forex and index futures instruments.' 
                  : selectedEvent.impact === 'Medium'
                    ? 'Moderate impact release. Key liquidity pools may be swept before directional momentum resumes.'
                    : 'Low impact economic release. Unlikely to disrupt established intraday market structure trends.'}
              </p>
            </div>

            <div style={{ marginTop: 'var(--s5)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setSelectedEvent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default News;
