import React, { useState, useEffect, useMemo } from 'react';
import { news as newsApi } from '../services/api';
import {
  Calendar as CalendarIcon, Globe, AlertCircle,
  Filter, ChevronLeft, ChevronRight, Newspaper,
  RefreshCw, X, Zap, Search, Flame, Clock, Sparkles, LayoutGrid, CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const getImpactColor = (impact) => {
  switch ((impact || '').toLowerCase()) {
    case 'high':
      return {
        main: '#f87171',
        soft: 'rgba(248, 113, 113, 0.14)',
        border: 'rgba(248, 113, 113, 0.35)',
        glow: 'rgba(248, 113, 113, 0.25)',
      };
    case 'medium':
      return {
        main: '#f97316',
        soft: 'rgba(249, 115, 22, 0.14)',
        border: 'rgba(249, 115, 22, 0.35)',
        glow: 'rgba(249, 115, 22, 0.2)',
      };
    case 'low':
      return {
        main: '#10b981',
        soft: 'rgba(16, 185, 129, 0.14)',
        border: 'rgba(16, 185, 129, 0.35)',
        glow: 'rgba(16, 185, 129, 0.2)',
      };
    case 'holiday':
    default:
      return {
        main: '#a1a1aa',
        soft: 'rgba(161, 161, 170, 0.12)',
        border: 'rgba(161, 161, 170, 0.25)',
        glow: 'transparent',
      };
  }
};

const News = () => {
  const [rawEvents, setRawEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [impactFilter, setImpactFilter] = useState('All');
  const [currencyFilter, setCurrencyFilter] = useState('All');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [viewMode, setViewMode] = useState('strip'); // 'strip' or 'grid'

  // Month navigation state
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  // Event Detail Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Fetch economic calendar news
  const loadNews = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await newsApi.list({ year: currentYear, month: currentMonth });
      setRawEvents(data || []);
    } catch (err) {
      console.error('Failed to load news:', err);
      setError('Failed to fetch economic calendar news. Please check your network connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, [currentYear, currentMonth]);

  // 1. FAST NORMALIZE: Pre-compute formatted date strings & keys ONCE when rawEvents change
  const processedEvents = useMemo(() => {
    return rawEvents.map(e => {
      let dateObj = new Date(e.date);
      if (isNaN(dateObj.getTime())) dateObj = new Date();

      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;

      const dateLabel = dateObj.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });

      const timeFormatted = dateObj.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });

      return {
        ...e,
        dateObj,
        dateKey,
        dateLabel,
        timeFormatted,
        impactNormalized: (e.impact || 'Low').trim(),
        countryUpper: (e.country || 'USD').toUpperCase(),
      };
    });
  }, [rawEvents]);

  // 2. FAST INDEXING: Single-pass map creation for O(1) date lookups & summary dots
  const { eventsByDateMap, dailyImpactSummaryMap, uniqueCurrencies } = useMemo(() => {
    const byDate = {};
    const summary = {};
    const currencies = new Set();

    processedEvents.forEach(e => {
      currencies.add(e.countryUpper);

      if (!byDate[e.dateKey]) byDate[e.dateKey] = [];
      byDate[e.dateKey].push(e);

      if (!summary[e.dateKey]) {
        summary[e.dateKey] = { hasHigh: false, hasMed: false, hasLow: false, hasHoliday: false, count: 0 };
      }
      summary[e.dateKey].count += 1;
      const imp = e.impactNormalized.toLowerCase();
      if (imp === 'high') summary[e.dateKey].hasHigh = true;
      else if (imp === 'medium') summary[e.dateKey].hasMed = true;
      else if (imp === 'low') summary[e.dateKey].hasLow = true;
      else if (imp === 'holiday') summary[e.dateKey].hasHoliday = true;
    });

    return {
      eventsByDateMap: byDate,
      dailyImpactSummaryMap: summary,
      uniqueCurrencies: ['All', ...Array.from(currencies).sort()]
    };
  }, [processedEvents]);

  // Auto-select initial date when events load
  useEffect(() => {
    if (processedEvents.length > 0) {
      const now = new Date();
      const todayYyyy = now.getFullYear();
      const todayMm = String(now.getMonth() + 1).padStart(2, '0');
      const todayDd = String(now.getDate()).padStart(2, '0');
      const todayKey = `${todayYyyy}-${todayMm}-${todayDd}`;

      if (eventsByDateMap[todayKey]) {
        setSelectedCalendarDate(todayKey);
      } else {
        // Pick earliest available date key
        const keys = Object.keys(eventsByDateMap).sort();
        setSelectedCalendarDate(keys[0] || null);
      }
    } else {
      setSelectedCalendarDate(null);
    }
  }, [processedEvents, eventsByDateMap]);

  // 3. FAST FILTERING: Zero date parsing during filter operations
  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return processedEvents.filter(e => {
      if (impactFilter !== 'All' && e.impactNormalized.toLowerCase() !== impactFilter.toLowerCase()) return false;
      if (currencyFilter !== 'All' && e.countryUpper !== currencyFilter.toUpperCase()) return false;
      if (selectedCalendarDate && e.dateKey !== selectedCalendarDate) return false;
      if (query) {
        const titleMatch = e.title?.toLowerCase().includes(query);
        const countryMatch = e.countryUpper.toLowerCase().includes(query);
        if (!titleMatch && !countryMatch) return false;
      }
      return true;
    });
  }, [processedEvents, impactFilter, currencyFilter, selectedCalendarDate, searchQuery]);

  // Group filtered events by dateLabel for section rendering
  const groupedEvents = useMemo(() => {
    const groups = {};
    filteredEvents.forEach(e => {
      if (!groups[e.dateLabel]) groups[e.dateLabel] = [];
      groups[e.dateLabel].push(e);
    });
    return Object.entries(groups);
  }, [filteredEvents]);

  // Find next upcoming high impact release for Hero Banner
  const nextHighImpactEvent = useMemo(() => {
    const now = new Date();
    return processedEvents.find(e => e.impactNormalized.toLowerCase() === 'high' && e.dateObj >= now) ||
      processedEvents.find(e => e.impactNormalized.toLowerCase() === 'high');
  }, [processedEvents]);

  // Statistics summaries
  const stats = useMemo(() => {
    let high = 0, med = 0, low = 0;
    processedEvents.forEach(e => {
      const imp = e.impactNormalized.toLowerCase();
      if (imp === 'high') high++;
      else if (imp === 'medium') med++;
      else if (imp === 'low') low++;
    });
    return { total: processedEvents.length, high, med, low };
  }, [processedEvents]);

  // Generate Month Days (Strip and Grid)
  const monthDays = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const mm = String(currentMonth + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateKey = `${currentYear}-${mm}-${dd}`;
      const weekday = dateObj.toLocaleDateString(undefined, { weekday: 'short' });

      days.push({
        dayNum: d,
        weekday,
        dateKey,
        dateObj,
        isToday: new Date().toISOString().slice(0, 10) === dateKey
      });
    }
    return days;
  }, [currentYear, currentMonth]);

  // Generate 42-cell full calendar grid
  const calendarGridCells = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const cells = [];
    // Prev month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const mm = String(prevM + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({
        dayNum: d,
        dateKey: `${prevY}-${mm}-${dd}`,
        isCurrentMonth: false
      });
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(currentMonth + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateKey = `${currentYear}-${mm}-${dd}`;
      cells.push({
        dayNum: d,
        dateKey,
        isCurrentMonth: true,
        isToday: new Date().toISOString().slice(0, 10) === dateKey
      });
    }
    // Next month padding
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const mm = String(nextM + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({
        dayNum: d,
        dateKey: `${nextY}-${mm}-${dd}`,
        isCurrentMonth: false
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)', width: '100%' }}
    >
      {/* ══ Header Title & Quick Stats ══ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--s3)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '6px 8px', borderRadius: 'var(--r-md)', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex' }}>
              <Newspaper size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                Economic Terminal
                <span style={{ fontSize: '0.55rem', padding: '2px 6px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.25)', fontWeight: 700 }}>
                  LIVE FEED
                </span>
              </h1>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>High-frequency macroeconomic releases & volatility calendar</div>
            </div>
          </div>
        </div>

        {/* Quick Impact Counters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap' }}>
          <div className="glass" style={{ padding: '6px 12px', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border)', fontSize: '0.72rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Releases:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{stats.total}</strong>
          </div>

          <div
            onClick={() => setImpactFilter(impactFilter === 'High' ? 'All' : 'High')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--r-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(248, 113, 113, 0.3)',
              background: impactFilter === 'High' ? 'rgba(248, 113, 113, 0.2)' : 'rgba(248, 113, 113, 0.08)',
              color: '#f87171',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 700,
              transition: 'all 0.2s ease'
            }}
          >
            <Flame size={13} />
            High: {stats.high}
          </div>

          <div
            onClick={() => setImpactFilter(impactFilter === 'Medium' ? 'All' : 'Medium')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--r-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(249, 115, 22, 0.3)',
              background: impactFilter === 'Medium' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.08)',
              color: '#f97316',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 700,
              transition: 'all 0.2s ease'
            }}
          >
            Med: {stats.med}
          </div>

          <div
            onClick={() => setImpactFilter(impactFilter === 'Low' ? 'All' : 'Low')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--r-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              background: impactFilter === 'Low' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.08)',
              color: '#10b981',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 700,
              transition: 'all 0.2s ease'
            }}
          >
            Low: {stats.low}
          </div>

          <button
            onClick={() => loadNews(true)}
            disabled={loading || refreshing}
            className="btn"
            style={{ padding: '6px 10px', height: '32px', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.72rem' }}
          >
            <RefreshCw size={13} className={refreshing ? 'spin-anim' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ══ Next High Impact Highlight Banner ══ */}
      {nextHighImpactEvent && (
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="glass"
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--r-lg)',
            background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.1) 0%, rgba(249, 115, 22, 0.05) 100%)',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--s3)',
            boxShadow: '0 4px 20px rgba(248, 113, 113, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '50%', background: 'rgba(248, 113, 113, 0.2)', color: '#f87171', display: 'flex' }}>
              <Zap size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#f87171', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  FEATURED HIGH-IMPACT RELEASE
                </span>
                <span style={{ fontSize: '0.68rem', padding: '1px 6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: '4px', fontWeight: 700 }}>
                  {nextHighImpactEvent.countryUpper}
                </span>
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {nextHighImpactEvent.title}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Release Time</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>
                {nextHighImpactEvent.dateLabel} · {nextHighImpactEvent.timeFormatted}
              </span>
            </div>
            <button
              onClick={() => setSelectedEvent(nextHighImpactEvent)}
              className="btn"
              style={{ padding: '6px 14px', background: '#f87171', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}
            >
              Analyze Volatility
            </button>
          </div>
        </motion.div>
      )}

      {/* ══ Filter Toolbar & Search Bar ══ */}
      <div className="glass" style={{ padding: '10px 14px', borderRadius: 'var(--r-lg)', background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--s3)' }}>
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-glass)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 12px', flex: 1, minWidth: '220px', maxWidth: '380px' }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search news events (e.g. FOMC, CPI, NFP, Powell)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.75rem', width: '100%' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Impact & Currency Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', flexWrap: 'wrap' }}>
          {/* Impact Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface-glass)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '4px 10px', height: '34px' }}>
            <Filter size={13} style={{ color: 'var(--text-muted)' }} />
            <select
              value={impactFilter}
              onChange={e => setImpactFilter(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
            >
              <option value="All">All Impact Levels</option>
              <option value="High">High Impact</option>
              <option value="Medium">Medium Impact</option>
              <option value="Low">Low Impact</option>
              <option value="Holiday">Holidays</option>
            </select>
          </div>

          {/* Currency Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface-glass)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '4px 10px', height: '34px' }}>
            <Globe size={13} style={{ color: 'var(--accent)' }} />
            <select
              value={currencyFilter}
              onChange={e => setCurrencyFilter(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
            >
              {uniqueCurrencies.map(curr => (
                <option key={curr} value={curr}>{curr === 'All' ? 'All Currencies' : curr}</option>
              ))}
            </select>
          </div>

          {/* View Mode Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-glass)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '2px', height: '34px' }}>
            <button
              onClick={() => setViewMode('strip')}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--r-xs)',
                border: 'none',
                background: viewMode === 'strip' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'strip' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
              title="Day Strip View"
            >
              <CalendarDays size={13} />
              Ribbon
            </button>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--r-xs)',
                border: 'none',
                background: viewMode === 'grid' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'grid' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
              title="Month Grid View"
            >
              <LayoutGrid size={13} />
              Grid
            </button>
          </div>
        </div>
      </div>

      {/* ══ Calendar Navigation & Day Selector Container ══ */}
      <div className="glass" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-lg)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        {/* Month Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h3>
            {selectedCalendarDate && (
              <button
                onClick={() => setSelectedCalendarDate(null)}
                style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600 }}
              >
                View Full Month Releases
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handlePrevMonth} style={{ background: 'var(--surface-glass)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--r-md)', padding: '6px', cursor: 'pointer', display: 'flex' }}>
              <ChevronLeft size={16} />
            </motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleNextMonth} style={{ background: 'var(--surface-glass)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--r-md)', padding: '6px', cursor: 'pointer', display: 'flex' }}>
              <ChevronRight size={16} />
            </motion.button>
          </div>
        </div>

        {/* View Mode 1: Horizontal Scrollable Ribbon Day Selector (Zero-Lag) */}
        {viewMode === 'strip' ? (
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'thin' }}>
            {monthDays.map(cell => {
              const isSelected = selectedCalendarDate === cell.dateKey;
              const daySummary = dailyImpactSummaryMap[cell.dateKey];
              const hasEvents = daySummary && daySummary.count > 0;

              return (
                <motion.div
                  key={cell.dateKey}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCalendarDate(isSelected ? null : cell.dateKey)}
                  style={{
                    minWidth: '54px',
                    height: '56px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--r-md)',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--accent)' : (cell.isToday ? 'var(--accent-soft)' : 'var(--surface-glass)'),
                    border: isSelected ? '1px solid var(--accent)' : (cell.isToday ? '1px solid var(--border-accent)' : '1px solid var(--border)'),
                    color: isSelected ? '#fff' : 'var(--text-primary)',
                    boxShadow: isSelected ? '0 0 12px var(--accent-glow)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', opacity: isSelected ? 0.9 : 0.6 }}>
                    {cell.weekday}
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: '1px' }}>
                    {cell.dayNum}
                  </span>

                  {/* Impact Dots */}
                  <div style={{ display: 'flex', gap: '2px', height: '4px', marginTop: '3px', alignItems: 'center' }}>
                    {daySummary?.hasHigh && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#f87171' }} />}
                    {daySummary?.hasMed && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#f97316' }} />}
                    {daySummary?.hasLow && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981' }} />}
                    {!hasEvents && <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'transparent' }} />}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* View Mode 2: Month Grid View (Zero-Lag Pre-Indexed) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '4px' }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                <span key={idx} style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)' }}>{d}</span>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {calendarGridCells.map((cell, idx) => {
                const isSelected = selectedCalendarDate === cell.dateKey;
                const daySummary = dailyImpactSummaryMap[cell.dateKey];

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedCalendarDate(isSelected ? null : cell.dateKey)}
                    style={{
                      height: '38px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 'var(--r-xs)',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--accent)' : (cell.isToday ? 'var(--accent-soft)' : 'var(--surface-glass)'),
                      border: isSelected ? '1px solid var(--accent)' : (cell.isToday ? '1px solid var(--border-accent)' : '1px solid var(--border)'),
                      color: isSelected ? '#fff' : (cell.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)'),
                      opacity: cell.isCurrentMonth ? 1 : 0.35,
                      position: 'relative',
                    }}
                  >
                    <span style={{ fontSize: '0.74rem', fontWeight: cell.isToday || isSelected ? 800 : 500 }}>
                      {cell.dayNum}
                    </span>
                    <div style={{ display: 'flex', gap: '2px', height: '4px', marginTop: '2px', alignItems: 'center' }}>
                      {daySummary?.hasHigh && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#f87171' }} />}
                      {daySummary?.hasMed && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#f97316' }} />}
                      {daySummary?.hasLow && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981' }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ══ Event List Feed Section ══ */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '68px', width: '100%', borderRadius: 'var(--r-md)' }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ padding: 'var(--s8) 0', textAlign: 'center', color: 'var(--loss)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={32} />
          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{error}</div>
          <button className="btn btn-secondary btn-sm" onClick={() => loadNews()}>Retry Fetch</button>
        </div>
      ) : groupedEvents.length === 0 ? (
        <div className="glass" style={{ padding: 'var(--s8)', textAlign: 'center', borderRadius: 'var(--r-lg)', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={24} style={{ opacity: 0.5 }} />
          <div>No economic releases match your current filters or search query.</div>
          {(selectedCalendarDate || impactFilter !== 'All' || currencyFilter !== 'All' || searchQuery) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSelectedCalendarDate(null);
                setImpactFilter('All');
                setCurrencyFilter('All');
                setSearchQuery('');
              }}
              style={{ fontSize: '0.72rem', marginTop: '6px' }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
          {groupedEvents.map(([dateLabel, groupEvents]) => (
            <div key={dateLabel} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
              {/* Date Group Header */}
              <div style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} style={{ color: 'var(--accent)' }} />
                  {dateLabel}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {groupEvents.length} economic event{groupEvents.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Event Cards Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                {groupEvents.map((ev, index) => {
                  const colors = getImpactColor(ev.impactNormalized);
                  const isSelected = selectedEvent && selectedEvent.title === ev.title && selectedEvent.date === ev.date;

                  return (
                    <motion.div
                      key={ev.id || index}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      onClick={() => setSelectedEvent(isSelected ? null : ev)}
                      whileHover={{ y: -1, boxShadow: `0 4px 16px ${colors.glow}` }}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '85px 75px 1fr 200px',
                        alignItems: 'center',
                        padding: '12px 16px',
                        borderRadius: 'var(--r-md)',
                        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                        background: isSelected ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                        cursor: 'pointer',
                        gap: '12px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Release Time */}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                        {ev.timeFormatted}
                      </div>

                      {/* Country Badge */}
                      <div>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: 'var(--text-primary)',
                          background: 'var(--surface-glass)',
                          border: '1px solid var(--border-mid)',
                          borderRadius: '5px',
                          padding: '3px 8px',
                          letterSpacing: '0.04em'
                        }}>
                          {ev.countryUpper}
                        </span>
                      </div>

                      {/* Title & Impact Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {ev.title}
                        </span>
                        <span style={{
                          background: colors.soft,
                          color: colors.main,
                          border: `1px solid ${colors.border}`,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.58rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {ev.impactNormalized.toLowerCase() === 'high' && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f87171' }} />}
                          {ev.impactNormalized}
                        </span>
                      </div>

                      {/* Forecast & Previous Numbers */}
                      <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', alignItems: 'center', fontSize: '0.72rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Forecast</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{ev.forecast || '—'}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Previous</span>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>{ev.previous || '—'}</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                          <ChevronRight size={15} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ Event Analysis Detail Modal ══ */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="glass-deep modal-panel"
              style={{ maxWidth: '500px', padding: 'var(--s6)', borderRadius: 'var(--r-lg)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--s4)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {selectedEvent.countryUpper} · {selectedEvent.timeFormatted}
                    </span>
                    <span style={{
                      fontSize: '0.58rem',
                      fontWeight: 800,
                      color: getImpactColor(selectedEvent.impactNormalized).main,
                      background: getImpactColor(selectedEvent.impactNormalized).soft,
                      border: `1px solid ${getImpactColor(selectedEvent.impactNormalized).border}`,
                      padding: '1px 6px',
                      borderRadius: '4px'
                    }}>
                      {selectedEvent.impactNormalized} IMPACT
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: '6px 0 0 0' }}>
                    {selectedEvent.title}
                  </h3>
                </div>
                <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Forecast / Previous Data Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--s3)', marginBottom: 'var(--s5)' }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s3)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Impact</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: getImpactColor(selectedEvent.impactNormalized).main, marginTop: 2 }}>{selectedEvent.impactNormalized}</div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s3)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Forecast</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2, fontFamily: 'JetBrains Mono' }}>{selectedEvent.forecast || '—'}</div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s3)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Previous</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-secondary)', marginTop: 2, fontFamily: 'JetBrains Mono' }}>{selectedEvent.previous || '—'}</div>
                </div>
              </div>

              {/* Volatility & Risk Guidance */}
              <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={15} style={{ color: 'var(--accent)' }} /> Expected Volatility & Trading Rules
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {selectedEvent.impactNormalized.toLowerCase() === 'high'
                    ? '⚠️ High Volatility Alert: Sharp spread widening and fast directional sweeps expected. Avoid opening market orders 5 minutes before/after this release.'
                    : selectedEvent.impactNormalized.toLowerCase() === 'medium'
                      ? '⚡ Moderate Volatility: Liquidity sweeps across session highs/lows are common. Exercise normal risk management.'
                      : 'ℹ️ Low Volatility Release: Minimal impact on established intraday order flow trends.'}
                </p>
              </div>

              <div style={{ marginTop: 'var(--s5)', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary btn-sm" onClick={() => setSelectedEvent(null)}>Done</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default News;
