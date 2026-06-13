import React, { useState, useEffect, useRef, useMemo } from 'react';
import { news as newsApi } from '../services/api';
import {
  Brain, Send, Sparkles, Trash2, Cpu,
  Calendar, Globe, ShieldAlert, AlertCircle,
  Filter, ArrowRight, ChevronLeft, ChevronRight, Newspaper,
  Info, CornerDownRight, RefreshCw
} from 'lucide-react';

// Bold text custom parser (matching AiCoach.jsx)
const parseBoldText = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={idx} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

// Markdown list / header parser (matching AiCoach.jsx)
const formatMessageContent = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    let content = line.trim();
    if (!content) return <div key={lineIdx} style={{ height: '8px' }} />;

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

    return (
      <p key={lineIdx} style={{ fontSize: '0.78rem', lineHeight: '1.5', margin: '6px 0' }}>
        {parseBoldText(content)}
      </p>
    );
  });
};

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

const isToday = (dateStr) => {
  const d = new Date(dateStr);
  const today = new Date();
  return d.getFullYear() === today.getFullYear() &&
         d.getMonth() === today.getMonth() &&
         d.getDate() === today.getDate();
};

const isTomorrow = (dateStr) => {
  const d = new Date(dateStr);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return d.getFullYear() === tomorrow.getFullYear() &&
         d.getMonth() === tomorrow.getMonth() &&
         d.getDate() === tomorrow.getDate();
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

  // Chat
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatBottomRef = useRef(null);

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

  // Scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiLoading]);

  // Derived list of all unique dates present in the events
  const uniqueDates = useMemo(() => {
    const datesMap = {};
    events.forEach(e => {
      try {
        const d = new Date(e.date);
        const key = d.toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' });
        if (!datesMap[key]) {
          datesMap[key] = {
            rawDate: d,
            dateKey: key,
            dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
            dayNum: d.getDate(),
            monthName: d.toLocaleDateString(undefined, { month: 'short' }),
            label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          };
        }
      } catch (err) {
        // Ignore invalid dates
      }
    });
    
    // Sort dates chronologically
    return Object.values(datesMap).sort((a, b) => a.rawDate - b.rawDate);
  }, [events]);

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
        const firstEventDate = new Date(events[0].date).toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' });
        setSelectedCalendarDate(firstEventDate);
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
      // 1. Impact Filter
      if (impactFilter !== 'All' && e.impact !== impactFilter) return false;
      
      // 2. Currency Filter
      if (currencyFilter !== 'All' && e.country?.toUpperCase() !== currencyFilter.toUpperCase()) return false;
      
      // 3. Calendar Date Filter
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
    
    // Pad previous month days
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
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(currentYear, currentMonth, i);
      cells.push({
        date: d,
        dayNum: i,
        isCurrentMonth: true,
        dateKey: d.toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' })
      });
    }
    
    // Pad next month days to reach 42 cells grid
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

  // Selected news item chat initializer
  const handleAskZella = async (eventToAnalyze) => {
    const ev = eventToAnalyze || selectedEvent;
    if (!ev || aiLoading) return;

    const userPromptText = `Please analyze the impact of the upcoming ${ev.country} ${ev.title} (${ev.impact} impact) economic event. Previous was ${ev.previous || 'N/A'}, forecast is ${ev.forecast || 'N/A'}. What are the primary scenarios, expected volatility, and key risk management strategies I should implement?`;

    const userMsg = { role: 'user', content: userPromptText };
    const newMessages = [userMsg];
    setMessages(newMessages);
    setAiLoading(true);

    try {
      const response = await newsApi.analyze(ev, newMessages);
      setMessages(prev => [...prev, response]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ **Error Connecting to Nvidia AI Catalog**\n\nFailed to retrieve analysis. Please ensure the server is running and your \`NVIDIA_API_KEY\` is configured in your environmental variables.`
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Chat follow up send handler
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!aiInput.trim() || aiLoading || !selectedEvent) return;

    const userMsg = { role: 'user', content: aiInput };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setAiInput('');
    setAiLoading(true);

    try {
      const response = await newsApi.analyze(selectedEvent, updatedMessages);
      setMessages(prev => [...prev, response]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Failed to retrieve follow-up analysis. Please verify your connection status and key parameters.'
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Clear current analysis chat
  const handleClearChat = () => {
    setMessages([]);
  };

  // Helper for impact colored borders & badges (using exact requested colors)
  const getImpactColor = (impact) => {
    switch ((impact || '').toLowerCase()) {
      case 'high':
        return {
          main: '#ef4444', // Red
          soft: 'rgba(239, 68, 68, 0.1)',
          border: 'rgba(239, 68, 68, 0.25)',
        };
      case 'medium':
        return {
          main: '#f97316', // Orange
          soft: 'rgba(249, 115, 22, 0.1)',
          border: 'rgba(249, 115, 22, 0.25)',
        };
      case 'low':
        return {
          main: '#10b981', // Green
          soft: 'rgba(16, 185, 129, 0.1)',
          border: 'rgba(16, 185, 129, 0.25)',
        };
      case 'holiday':
      default:
        return {
          main: '#8a8a8a', // Dark Silver
          soft: 'rgba(138, 138, 138, 0.1)',
          border: 'rgba(138, 138, 138, 0.25)',
        };
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 420px',
      gap: 'var(--s4)',
      height: 'calc(100vh - 120px)',
      minHeight: '520px',
      alignItems: 'stretch',
    }}>
      {/* LEFT COLUMN: Clean economic calendar */}
      <div className="glass anim-fade-up delay-1" style={{
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
            {/* Impact Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-sm)', padding: '2px 8px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex' }}><ShieldAlert size={12} /></span>
              <select 
                value={impactFilter} 
                onChange={e => setImpactFilter(e.target.value)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.7rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="All">All Impact</option>
                <option value="High">High Impact</option>
                <option value="Medium">Medium Impact</option>
                <option value="Low">Low Impact</option>
                <option value="Holiday">Holidays</option>
              </select>
            </div>

            {/* Currency Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-sm)', padding: '2px 8px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex' }}><Globe size={12} /></span>
              <select 
                value={currencyFilter} 
                onChange={e => setCurrencyFilter(e.target.value)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.7rem', outline: 'none', cursor: 'pointer' }}
              >
                {uniqueCurrencies.map(curr => (
                  <option key={curr} value={curr}>{curr === 'All' ? 'All Currencies' : curr}</option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
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
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <ChevronLeft size={16} />
                </button>
                <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  {monthNames[currentMonth]} {currentYear}
                </strong>
                <button 
                  onClick={handleNextMonth}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '4px' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
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

              {/* Calendar Days Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {calendarDays.map((cell, idx) => {
                  const isSelected = selectedCalendarDate === cell.dateKey;
                  const isTodayCell = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' }) === cell.dateKey;
                  
                  // Filter events for this cell date
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
                      onClick={() => {
                        if (dayEvents.length > 0) {
                          setSelectedCalendarDate(cell.dateKey);
                        }
                      }}
                      style={{
                        height: '38px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--r-xs)',
                        cursor: dayEvents.length > 0 ? 'pointer' : 'default',
                        background: isSelected ? 'var(--accent)' : (isTodayCell ? 'var(--accent-soft)' : 'transparent'),
                        border: isSelected ? '1px solid var(--accent)' : (isTodayCell ? '1px solid var(--border-accent)' : '1px solid transparent'),
                        color: isSelected ? '#fff' : (cell.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)'),
                        opacity: cell.isCurrentMonth ? 1 : 0.4,
                        transition: 'all var(--t-fast)',
                        position: 'relative'
                      }}
                      onMouseEnter={e => {
                        if (!isSelected && dayEvents.length > 0) {
                          e.currentTarget.style.background = 'var(--bg-hover)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = isTodayCell ? 'var(--accent-soft)' : 'transparent';
                        }
                      }}
                    >
                      {/* Day Number */}
                      <span style={{ fontSize: '0.72rem', fontWeight: isTodayCell || isSelected ? 700 : 500 }}>
                        {cell.dayNum}
                      </span>

                      {/* Event Impact Indicators Grid (low/medium/high/holiday dots at the bottom) */}
                      <div style={{ display: 'flex', gap: '2px', height: '4px', marginTop: '2px', alignItems: 'center' }}>
                        {hasHigh && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ef4444' }} />}
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
            <div style={{ padding: 'var(--s10) 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              No economic releases matching current filters.
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
                          onClick={() => setSelectedEvent(ev)}
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
                            transition: 'all var(--t-fast)',
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

      {/* RIGHT COLUMN: Zella Economic Analyst AI Widget */}
      <div className="glass anim-fade-up delay-2" style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 'var(--r-lg)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)'
      }}>
        {/* Chat Header */}
        <div style={{
          padding: 'var(--s3) var(--s4)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-tertiary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent)', display: 'flex' }}><Brain size={16} /></span>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>Zella AI News Analyst</span>
              <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Llama-3.1-Nemotron-70B-Instruct</span>
            </div>
          </div>
          {messages.length > 0 && (
            <button 
              onClick={handleClearChat} 
              className="btn btn-ghost btn-sm"
              style={{ padding: '4px', height: 'auto', border: 'none', display: 'flex', alignItems: 'center' }}
              title="Clear Analysis History"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        {/* Selected Event Details Card or Empty State */}
        {!selectedEvent ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--s8)',
            textAlign: 'center',
            color: 'var(--text-muted)',
            gap: 'var(--s4)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--r-md)',
              background: 'var(--surface-glass)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}>
              <Info size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>No Event Selected</div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Select an economic news event from the calendar to launch the economic analyst module and prepare your session strategies.
              </p>
            </div>
          </div>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Event Info Card */}
            <div style={{
              padding: 'var(--s4)',
              background: 'var(--bg-tertiary)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--s2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Selected indicator</span>
                  <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{selectedEvent.title}</strong>
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: getImpactColor(selectedEvent.impact).main,
                  background: getImpactColor(selectedEvent.impact).soft,
                  border: `1px solid ${getImpactColor(selectedEvent.impact).border}`,
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {selectedEvent.impact} Impact
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s3)', marginTop: '4px' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Currency</span>
                  <strong style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{selectedEvent.country}</strong>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Forecast</span>
                  <strong style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>{selectedEvent.forecast || 'N/A'}</strong>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Previous</span>
                  <strong style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>{selectedEvent.previous || 'N/A'}</strong>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div style={{
              flex: 1,
              padding: 'var(--s4)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--s4)',
              background: 'var(--bg-primary)'
            }}>
              {messages.length === 0 ? (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  gap: 'var(--s3)'
                }}>
                  <Cpu size={24} style={{ color: 'var(--accent)' }} />
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>NVIDIA Macro Analyst Offline</div>
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', maxWidth: '240px', margin: '4px auto 0 auto', lineHeight: '1.4' }}>
                      Click the analysis chip below to request trade setup diagnostics.
                    </p>
                  </div>
                  
                  {/* Quick analysis chip */}
                  <button
                    onClick={() => handleAskZella()}
                    disabled={aiLoading}
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 'var(--s2)', gap: '6px' }}
                  >
                    <Sparkles size={12} />
                    Analyze Economic Volatility
                  </button>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className="anim-fade-in"
                      style={{
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '90%',
                        display: 'flex',
                        gap: '8px',
                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: 'var(--r-sm)',
                        background: msg.role === 'user' ? 'linear-gradient(135deg, var(--accent), #a78bfa)' : 'var(--bg-elevated)',
                        border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {msg.role === 'user' ? (
                          <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#fff' }}>U</span>
                        ) : (
                          <span style={{ color: 'var(--accent)', display: 'flex' }}><Cpu size={10} /></span>
                        )}
                      </div>

                      {/* Msg Box */}
                      <div style={{
                        background: msg.role === 'user' ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                        border: '1px solid',
                        borderColor: msg.role === 'user' ? 'var(--border-accent)' : 'var(--border)',
                        borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                        padding: '8px 12px',
                        color: 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        boxShadow: 'var(--shadow-xs)'
                      }}>
                        {msg.role === 'user' ? msg.content : formatMessageContent(msg.content)}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Typing indicator */}
              {aiLoading && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: 'var(--r-sm)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ color: 'var(--accent)', display: 'flex' }}><Cpu size={10} /></span>
                  </div>
                  <div className="glass" style={{
                    borderRadius: '12px 12px 12px 0',
                    padding: '8px 12px',
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)'
                  }}>
                    <span className="status-dot live" style={{ animation: 'pulse-glow 1s infinite' }} />
                    <span className="status-dot live" style={{ animation: 'pulse-glow 1s infinite 0.2s' }} />
                    <span className="status-dot live" style={{ animation: 'pulse-glow 1s infinite 0.4s' }} />
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar */}
            {messages.length > 0 && (
              <form onSubmit={handleSendMessage} style={{
                padding: 'var(--s3) var(--s4)',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-tertiary)',
                display: 'flex',
                gap: 'var(--s3)',
                alignItems: 'center'
              }}>
                <input
                  type="text"
                  className="input"
                  placeholder={aiLoading ? "Coach is generating response..." : "Ask follow up questions about setups..."}
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  disabled={aiLoading}
                  style={{
                    flex: 1,
                    height: '32px',
                    fontSize: '0.75rem',
                    background: 'var(--bg-primary)',
                    borderColor: 'var(--border-mid)'
                  }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={aiLoading || !aiInput.trim()}
                  style={{
                    padding: '0 var(--s3)',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--r-md)'
                  }}
                >
                  <Send size={12} />
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default News;
