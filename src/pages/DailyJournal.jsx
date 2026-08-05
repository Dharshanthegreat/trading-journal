import React, { useState, useEffect } from 'react';
import { useJournal } from '../contexts/JournalContext';
import { useTrades } from '../contexts/TradeContext';
import { format, addDays, subDays, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay } from 'date-fns';
import { NotebookPen, ChevronLeft, ChevronRight, Save, Trash2, Sun, BookOpen, Lightbulb, AlertTriangle, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { toNewYorkDateString } from '../utils/timezone';

const MOODS = [
  { emoji: '😤', label: 'Frustrated', value: 'frustrated' },
  { emoji: '😰', label: 'Anxious', value: 'anxious' },
  { emoji: '😐', label: 'Neutral', value: 'neutral' },
  { emoji: '😊', label: 'Good', value: 'good' },
  { emoji: '🔥', label: 'On Fire', value: 'fire' },
];

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

const DailyJournal = () => {
  const { currentEntry, getEntry, saveEntry, deleteEntry, loading, entries, fetchEntries } = useJournal();
  const { trades } = useTrades();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [form, setForm] = useState({
    pre_market: '', session_notes: '', lessons: '', mistakes: '', goals: '',
    mood: 'neutral', rating: 5,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    getEntry(dateStr);
  }, [dateStr, getEntry]);

  useEffect(() => {
    if (currentEntry) {
      setForm({
        pre_market: currentEntry.pre_market || '',
        session_notes: currentEntry.session_notes || '',
        lessons: currentEntry.lessons || '',
        mistakes: currentEntry.mistakes || '',
        goals: currentEntry.goals || '',
        mood: currentEntry.mood || 'neutral',
        rating: currentEntry.rating || 5,
      });
    } else {
      setForm({ pre_market: '', session_notes: '', lessons: '', mistakes: '', goals: '', mood: 'neutral', rating: 5 });
    }
  }, [currentEntry]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveEntry({ date: dateStr, ...form });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (currentEntry && confirm('Delete this journal entry?')) {
      await deleteEntry(currentEntry.id);
    }
  };

  // Extract trade date string robustly (handles date, entryTime, entry_time, createdAt)
  const getTradeDateStr = (t) => {
    if (!t) return '';
    if (t.date) return t.date.split('T')[0];
    if (t.entryTime) return toNewYorkDateString(t.entryTime);
    if (t.entry_time) return toNewYorkDateString(t.entry_time);
    if (t.createdAt) return t.createdAt.split('T')[0];
    return '';
  };

  // Filter trades for the selected date
  const dayTrades = trades.filter(t => getTradeDateStr(t) === dateStr);
  const dayPnL = dayTrades.reduce((a, t) => a + (t.pnl || 0), 0);

  const getMoodEmoji = (moodValue) => {
    const m = MOODS.find(x => x.value === moodValue);
    return m ? m.emoji : null;
  };

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = [];
  let day = startDate;
  while (day <= endDate) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const sections = [
    { key: 'pre_market', title: 'Pre-Market Plan', icon: <Sun size={13}/>, placeholder: 'What are you watching today? Key levels, news events, game plan...' },
    { key: 'session_notes', title: 'Session Notes', icon: <BookOpen size={13}/>, placeholder: 'How did the session go? What happened? Key observations...' },
    { key: 'lessons', title: 'Lessons Learned', icon: <Lightbulb size={13}/>, placeholder: 'What did you learn today? Insights about the market or yourself...' },
    { key: 'mistakes', title: 'Mistakes Made', icon: <AlertTriangle size={13}/>, placeholder: 'What mistakes did you make? How can you avoid them next time?' },
    { key: 'goals', title: 'Goals for Tomorrow', icon: <Target size={13}/>, placeholder: 'What are your focus areas for the next session?' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
      <div className="page-header">
        <div className="page-title"><NotebookPen size={18} style={{ opacity: 0.6 }}/> Daily Journal</div>
        <div className="page-subtitle">Reflect on your trading day</div>
      </div>

      {/* Date Navigation & Actions */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--s3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
          <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
            <ChevronLeft size={16}/>
          </motion.button>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', minWidth: 200, textAlign: 'center' }}>
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </div>
          <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
            <ChevronRight size={16}/>
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(new Date())} style={{ fontSize: '0.7rem' }}>
            Today
          </motion.button>
        </div>

        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          {currentEntry && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-danger btn-sm" onClick={handleDelete}><Trash2 size={13}/></motion.button>
          )}
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={14}/>
            {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Entry'}
          </motion.button>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--s5)' }}>
        {/* Main Editor */}
        <div className="journal-editor">
          {/* Mood Selector */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="journal-section">
            <div className="journal-section-title">Mood</div>
            <div className="mood-selector">
              {MOODS.map(m => (
                <motion.button
                  key={m.value}
                  whileHover={{ scale: 1.25 }}
                  whileTap={{ scale: 0.9 }}
                  className={`mood-btn ${form.mood === m.value ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, mood: m.value })}
                  title={m.label}
                >
                  {m.emoji}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Form Sections */}
          {sections.map((s, idx) => (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * (idx + 1) }}
              className="journal-section"
            >
              <div className="journal-section-title">
                <span style={{ color: 'var(--accent)' }}>{s.icon}</span>
                {s.title}
              </div>
              <textarea
                className="input"
                rows={3}
                placeholder={s.placeholder}
                value={form[s.key]}
                onChange={e => setForm({ ...form, [s.key]: e.target.value })}
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
              />
            </motion.div>
          ))}

          {/* Rating */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }} className="journal-section">
            <div className="journal-section-title">Day Rating: <span style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono' }}>{form.rating}/10</span></div>
            <input
              type="range" className="slider" min="1" max="10"
              value={form.rating}
              onChange={e => setForm({ ...form, rating: parseInt(e.target.value) })}
            />
          </motion.div>
        </div>

        {/* Sidebar — Day Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
          
          {/* Mini Calendar */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }} className="glass" style={{ padding: 'var(--s5)' }}>
            <div className="chart-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span>{format(selectedDate, 'MMMM yyyy')}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="btn btn-ghost btn-sm" style={{ padding: '2px 4px' }} onClick={() => setSelectedDate(subMonths(selectedDate, 1))}><ChevronLeft size={14}/></button>
                <button className="btn btn-ghost btn-sm" style={{ padding: '2px 4px' }} onClick={() => setSelectedDate(addMonths(selectedDate, 1))}><ChevronRight size={14}/></button>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {calendarDays.map((d, i) => {
                const dStr = format(d, 'yyyy-MM-dd');
                const isSelected = isSameDay(d, selectedDate);
                const isCurrentMonth = isSameMonth(d, monthStart);
                const isToday = isSameDay(d, new Date());
                
                const entry = entries.find(e => e.date === dStr);
                const emoji = entry?.mood ? getMoodEmoji(entry.mood) : null;
                
                const dTrades = trades.filter(t => getTradeDateStr(t) === dStr);
                const dPnL = dTrades.reduce((a, t) => a + (t.pnl || 0), 0);
                
                let pnlColor = 'transparent';
                if (dTrades.length > 0) {
                  pnlColor = dPnL > 0 ? 'var(--profit)' : dPnL < 0 ? 'var(--loss)' : 'var(--text-muted)';
                }
                
                return (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedDate(d)}
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      borderRadius: 'var(--r-sm)',
                      border: isSelected ? '1px solid var(--accent)' : (isToday ? '1px dashed var(--border-strong)' : '1px solid transparent'),
                      background: isSelected ? 'var(--bg-active)' : 'transparent',
                      opacity: isCurrentMonth ? 1 : 0.3,
                      position: 'relative',
                      fontSize: '0.75rem',
                      fontWeight: isSelected || isToday ? 700 : 500,
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)'
                    }}
                  >
                    <span>{format(d, 'd')}</span>
                    <div style={{ fontSize: '0.65rem', marginTop: '2px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {emoji}
                    </div>
                    {dTrades.length > 0 && (
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: pnlColor, position: 'absolute', bottom: '2px' }} />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Day Summary Card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }} className="glass" style={{ padding: 'var(--s5)' }}>
            <div className="chart-title"><span>Day Summary</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              <div style={{ textAlign: 'center', padding: 'var(--s4) 0' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Net P&L</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: dayPnL >= 0 ? 'var(--profit)' : dayPnL < 0 ? 'var(--loss)' : 'var(--text-muted)' }}>
                  {dayTrades.length > 0 ? (
                    <AnimatedNumber value={dayPnL} prefix={dayPnL >= 0 ? '+$' : '$'} decimals={2} />
                  ) : (
                    '—'
                  )}
                </div>
              </div>
              <div className="divider" style={{ margin: '0' }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Trades</span>
                <span style={{ fontWeight: 600 }}>
                  <AnimatedNumber value={dayTrades.length} decimals={0} />
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Wins</span>
                <span style={{ fontWeight: 600, color: 'var(--profit)' }}>
                  <AnimatedNumber value={dayTrades.filter(t => t.pnl > 0).length} decimals={0} />
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Losses</span>
                <span style={{ fontWeight: 600, color: 'var(--loss)' }}>
                  <AnimatedNumber value={dayTrades.filter(t => t.pnl < 0).length} decimals={0} />
                </span>
              </div>
            </div>
          </motion.div>

          {/* Matched Day Trades List */}
          {dayTrades.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }} className="glass" style={{ padding: 'var(--s5)' }}>
              <div className="chart-title"><span>Trades</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                {dayTrades.map((t, i) => (
                  <motion.div
                    key={t.id || i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.04 }}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 0', borderBottom: i < dayTrades.length - 1 ? '1px solid var(--border)' : 'none',
                      fontSize: '0.78rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                      <span className={`badge ${t.type === 'Long' ? 'badge-profit' : 'badge-loss'}`} style={{ fontSize: '0.55rem' }}>{t.type}</span>
                      <span style={{ fontWeight: 600 }}>{t.symbol}</span>
                    </div>
                    <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: t.pnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                      <AnimatedNumber value={t.pnl} prefix={t.pnl >= 0 ? '+$' : '$'} decimals={2} />
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default DailyJournal;
