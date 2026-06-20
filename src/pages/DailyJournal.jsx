import React, { useState, useEffect } from 'react';
import { useJournal } from '../contexts/JournalContext';
import { useTrades } from '../contexts/TradeContext';
import { format, addDays, subDays } from 'date-fns';
import { NotebookPen, ChevronLeft, ChevronRight, Save, Trash2, Sun, BookOpen, Lightbulb, AlertTriangle, Target } from 'lucide-react';

import { toNewYorkDateString } from '../utils/timezone';

const MOODS = [
  { emoji: '😤', label: 'Frustrated', value: 'frustrated' },
  { emoji: '😰', label: 'Anxious', value: 'anxious' },
  { emoji: '😐', label: 'Neutral', value: 'neutral' },
  { emoji: '😊', label: 'Good', value: 'good' },
  { emoji: '🔥', label: 'On Fire', value: 'fire' },
];

const DailyJournal = () => {
  const { currentEntry, getEntry, saveEntry, deleteEntry, loading } = useJournal();
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

  // Trades for this day
  const dayTrades = trades.filter(t => t.entryTime && toNewYorkDateString(t.entryTime) === dateStr);
  const dayPnL = dayTrades.reduce((a, t) => a + (t.pnl || 0), 0);

  const sections = [
    { key: 'pre_market', title: 'Pre-Market Plan', icon: <Sun size={13}/>, placeholder: 'What are you watching today? Key levels, news events, game plan...' },
    { key: 'session_notes', title: 'Session Notes', icon: <BookOpen size={13}/>, placeholder: 'How did the session go? What happened? Key observations...' },
    { key: 'lessons', title: 'Lessons Learned', icon: <Lightbulb size={13}/>, placeholder: 'What did you learn today? Insights about the market or yourself...' },
    { key: 'mistakes', title: 'Mistakes Made', icon: <AlertTriangle size={13}/>, placeholder: 'What mistakes did you make? How can you avoid them next time?' },
    { key: 'goals', title: 'Goals for Tomorrow', icon: <Target size={13}/>, placeholder: 'What are your focus areas for the next session?' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
      <div className="page-header">
        <div className="page-title"><NotebookPen size={18} style={{ opacity: 0.6 }}/> Daily Journal</div>
        <div className="page-subtitle">Reflect on your trading day</div>
      </div>

      {/* Date Navigation & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--s3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
            <ChevronLeft size={16}/>
          </button>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', minWidth: 200, textAlign: 'center' }}>
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
            <ChevronRight size={16}/>
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(new Date())} style={{ fontSize: '0.7rem' }}>
            Today
          </button>
        </div>

        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          {currentEntry && (
            <button className="btn btn-danger btn-sm" onClick={handleDelete}><Trash2 size={13}/></button>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={14}/>
            {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Entry'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--s5)' }}>
        {/* Main Editor */}
        <div className="journal-editor">
          {/* Mood */}
          <div className="journal-section">
            <div className="journal-section-title">Mood</div>
            <div className="mood-selector">
              {MOODS.map(m => (
                <button
                  key={m.value}
                  className={`mood-btn ${form.mood === m.value ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, mood: m.value })}
                  title={m.label}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Sections */}
          {sections.map(s => (
            <div key={s.key} className="journal-section">
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
            </div>
          ))}

          {/* Rating */}
          <div className="journal-section">
            <div className="journal-section-title">Day Rating: <span style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono' }}>{form.rating}/10</span></div>
            <input
              type="range" className="slider" min="1" max="10"
              value={form.rating}
              onChange={e => setForm({ ...form, rating: parseInt(e.target.value) })}
            />
          </div>
        </div>

        {/* Sidebar — Day Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
          <div className="glass" style={{ padding: 'var(--s5)' }}>
            <div className="chart-title"><span>Day Summary</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              <div style={{ textAlign: 'center', padding: 'var(--s4) 0' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Net P&L</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: dayPnL >= 0 ? 'var(--profit)' : dayPnL < 0 ? 'var(--loss)' : 'var(--text-muted)' }}>
                  {dayTrades.length > 0 ? `${dayPnL >= 0 ? '+' : ''}$${Math.abs(dayPnL).toFixed(2)}` : '—'}
                </div>
              </div>
              <div className="divider" style={{ margin: '0' }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Trades</span>
                <span style={{ fontWeight: 600 }}>{dayTrades.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Wins</span>
                <span style={{ fontWeight: 600, color: 'var(--profit)' }}>{dayTrades.filter(t => t.pnl > 0).length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Losses</span>
                <span style={{ fontWeight: 600, color: 'var(--loss)' }}>{dayTrades.filter(t => t.pnl < 0).length}</span>
              </div>
            </div>
          </div>

          {dayTrades.length > 0 && (
            <div className="glass" style={{ padding: 'var(--s5)' }}>
              <div className="chart-title"><span>Trades</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                {dayTrades.map((t, i) => (
                  <div key={t.id || i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 0', borderBottom: i < dayTrades.length - 1 ? '1px solid var(--border)' : 'none',
                    fontSize: '0.78rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                      <span className={`badge ${t.type === 'Long' ? 'badge-profit' : 'badge-loss'}`} style={{ fontSize: '0.55rem' }}>{t.type}</span>
                      <span style={{ fontWeight: 600 }}>{t.symbol}</span>
                    </div>
                    <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: t.pnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                      {t.pnl >= 0 ? '+' : ''}${Math.abs(t.pnl).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyJournal;
