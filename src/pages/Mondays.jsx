import React, { useState, useEffect, useMemo } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { 
  CalendarDays, Image as ImageIcon, Brain, NotebookPen, 
  X, ZoomIn, Calendar, TrendingUp, TrendingDown, 
  Award, Zap, AlertTriangle, CheckCircle, Save
} from 'lucide-react';
import { formatInNewYork } from '../utils/timezone';

const EMOTION_COLORS = {
  Calm: '#818cf8', Confident: '#34d399', Anxious: '#fbbf24',
  Fearful: '#fca5a5', Greedy: '#f97316', FOMO: '#f87171',
  Disciplined: '#60a5fa', Revenge: '#ef4444',
};

const Mondays = () => {
  const { trades, fetchTrades } = useTrades();
  const [activeTab, setActiveTab] = useState('charts');
  const [lightbox, setLightbox] = useState(null);
  
  // Notes states
  const [notesText, setNotesText] = useState('');
  const [saveStatus, setSaveStatus] = useState(''); // '', 'saving', 'saved'

  // Fetch trades on component load
  useEffect(() => {
    fetchTrades({ limit: 1000 });
  }, [fetchTrades]);

  // Load notes from LocalStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('tz_monday_notes');
    if (savedNotes) {
      setNotesText(savedNotes);
    }
  }, []);

  // Filter trades for Monday
  const mondayTrades = useMemo(() => {
    return (trades || []).filter(t => {
      const entryDate = t.entryTime || t.entry_time;
      if (!entryDate) return false;
      return formatInNewYork(entryDate, 'EEEE') === 'Monday';
    });
  }, [trades]);

  // Filter Monday trades with charts
  const mondayCharts = useMemo(() => {
    return mondayTrades.filter(t => t.imageUrl);
  }, [mondayTrades]);

  // Handle note change with auto-save
  const handleNotesChange = (e) => {
    const val = e.target.value;
    setNotesText(val);
    setSaveStatus('saving');
    
    // Save to LocalStorage
    localStorage.setItem('tz_monday_notes', val);
    
    // Fake a brief saving animation state
    setTimeout(() => {
      setSaveStatus('saved');
    }, 600);
  };

  // Trigger manual save indicator clear
  useEffect(() => {
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => setSaveStatus(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  // Psychology Statistics
  const stats = useMemo(() => {
    if (mondayTrades.length === 0) return null;

    let totalPnL = 0;
    let wins = 0;
    let losses = 0;
    let totalFomo = 0;
    let totalConfidence = 0;
    let fomoCount = 0;
    let confidenceCount = 0;
    let totalDisciplineScore = 0;
    let revengeCount = 0;
    let fomoCost = 0;

    const tagCounts = {};

    mondayTrades.forEach(t => {
      const pnl = parseFloat(t.pnl) || 0;
      totalPnL += pnl;

      if (pnl > 0) wins++;
      else if (pnl < 0) losses++;

      // FOMO and Confidence
      const f = parseFloat(t.fomoLevel);
      const c = parseFloat(t.confidenceLevel);

      const validFomo = !isNaN(f) ? f : 5;
      const validConf = !isNaN(c) ? c : 5;

      totalFomo += validFomo;
      fomoCount++;

      totalConfidence += validConf;
      confidenceCount++;

      // Discipline score formula: ((10 - f) / 9 + (c - 1) / 9) / 2 * 100
      const fomoScore = (10 - validFomo) / 9;
      const confidenceScore = (validConf - 1) / 9;
      totalDisciplineScore += ((fomoScore + confidenceScore) / 2) * 100;

      // Emotion tags count
      if (t.emotionTags && Array.isArray(t.emotionTags)) {
        t.emotionTags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          if (tag === 'Revenge') revengeCount++;
        });
      }

      // FOMO Cost (FOMO >= 7)
      if (validFomo >= 7 && pnl < 0) {
        fomoCost += pnl;
      }
    });

    const avgFomo = fomoCount > 0 ? (totalFomo / fomoCount).toFixed(1) : '—';
    const avgConfidence = confidenceCount > 0 ? (totalConfidence / confidenceCount).toFixed(1) : '—';
    const disciplineScore = mondayTrades.length > 0 ? Math.round(totalDisciplineScore / mondayTrades.length) : 0;
    const winRate = mondayTrades.length > 0 ? ((wins / mondayTrades.length) * 100).toFixed(1) : '0';

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      winRate,
      totalPnL,
      avgFomo,
      avgConfidence,
      disciplineScore,
      revengeCount,
      fomoCost: Math.abs(fomoCost),
      topTags,
      totalTrades: mondayTrades.length,
      wins,
      losses
    };
  }, [mondayTrades]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
          <div style={{ 
            background: 'var(--accent-soft)', 
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--r-md)', 
            padding: '8px', 
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CalendarDays size={20} />
          </div>
          <div>
            <div className="page-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>Monday's Dashboard</div>
            <div className="page-subtitle" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              Dedicated planning, review, and psychology metrics for Monday trading sessions.
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="glass" style={{ display: 'flex', padding: '3px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
          {[
            { id: 'charts', label: 'Charts', icon: <ImageIcon size={14} /> },
            { id: 'psychology', label: 'Psychology', icon: <Brain size={14} /> },
            { id: 'notes', label: 'Notes', icon: <NotebookPen size={14} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: activeTab === tab.id ? 'var(--bg-hover)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--r-sm)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'charts' && (
        <div>
          {mondayCharts.length === 0 ? (
            <div className="glass empty-state" style={{ padding: 'var(--s12)', textAlign: 'center' }}>
              <ImageIcon size={36} style={{ opacity: 0.25, marginBottom: 'var(--s4)' }}/>
              <div className="empty-title" style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-secondary)' }}>No Monday charts uploaded</div>
              <div className="empty-desc" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', maxWidth: 400, margin: '8px auto 0' }}>
                Attach chart screenshots to trades logged on Mondays to construct your Monday playbook library.
              </div>
            </div>
          ) : (
            <div className="chart-gallery-grid">
              {mondayCharts.map(trade => (
                <div key={trade.id} className="glass chart-thumb" onClick={() => setLightbox(trade)}>
                  <img src={trade.imageUrl} alt={`${trade.symbol} Monday chart`} />
                  <div className="chart-thumb-overlay">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', marginBottom: 2 }}>{trade.symbol}</div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={10}/>
                          {trade.entryTime ? formatInNewYork(trade.entryTime, 'MMM d, yyyy') : '—'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                        <span className={`badge ${trade.pnl >= 0 ? 'badge-profit' : 'badge-loss'}`}>
                          {trade.pnl >= 0 ? '+' : ''}${Math.abs(trade.pnl).toFixed(2)}
                        </span>
                        <ZoomIn size={14} style={{ color: 'rgba(255,255,255,0.7)' }}/>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'psychology' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
          {!stats ? (
            <div className="glass empty-state" style={{ padding: 'var(--s12)', textAlign: 'center' }}>
              <Brain size={36} style={{ opacity: 0.25, marginBottom: 'var(--s4)' }}/>
              <div className="empty-title" style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-secondary)' }}>No statistics available</div>
              <div className="empty-desc" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', maxWidth: 400, margin: '8px auto 0' }}>
                Log trades executed on Mondays in your journal to compile psychological and mindset reports.
              </div>
            </div>
          ) : (
            <>
              {/* KPIs Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--s4)' }}>
                <div className="glass" style={{ padding: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monday P&L</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: stats.totalPnL >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                    {stats.totalPnL >= 0 ? '+' : '-'}${Math.abs(stats.totalPnL).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                    Across {stats.totalTrades} Monday trades
                  </div>
                </div>

                <div className="glass" style={{ padding: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Win Rate</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--accent)' }}>
                    {stats.winRate}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                    {stats.wins} Wins · {stats.losses} Losses
                  </div>
                </div>

                <div className="glass" style={{ padding: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Discipline Index</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: stats.disciplineScore >= 70 ? 'var(--profit)' : stats.disciplineScore >= 40 ? 'var(--warn)' : 'var(--loss)' }}>
                    {stats.disciplineScore}/100
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                    Mindset execution index
                  </div>
                </div>

                <div className="glass" style={{ padding: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenge Trades</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: stats.revengeCount > 0 ? 'var(--loss)' : 'var(--profit)' }}>
                    {stats.revengeCount}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                    Logged on Mondays
                  </div>
                </div>
              </div>

              {/* Psychology Metrics & Dials */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s5)', '@media (max-width: 768px)': { gridTemplateColumns: '1fr' } }}>
                {/* Mental Averages */}
                <div className="glass" style={{ padding: 'var(--s5)', display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 'var(--s2)', margin: 0, color: 'var(--text-primary)' }}>
                    Mindset Averages
                  </h3>
                  
                  {/* FOMO Progress Bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={12} style={{ color: 'var(--loss)' }}/> Average FOMO Level
                      </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{stats.avgFomo} / 10</strong>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${parseFloat(stats.avgFomo) * 10}%`, 
                        height: '100%', 
                        background: parseFloat(stats.avgFomo) >= 7 ? 'var(--loss)' : parseFloat(stats.avgFomo) >= 4 ? 'var(--warn)' : 'var(--profit)',
                        boxShadow: '0 0 6px rgba(239, 68, 68, 0.2)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                      Lower is better (1-3: Disciplined entry)
                    </div>
                  </div>

                  {/* Confidence Progress Bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Award size={12} style={{ color: 'var(--profit)' }}/> Average Confidence Level
                      </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{stats.avgConfidence} / 10</strong>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${parseFloat(stats.avgConfidence) * 10}%`, 
                        height: '100%', 
                        background: parseFloat(stats.avgConfidence) >= 7 ? 'var(--profit)' : parseFloat(stats.avgConfidence) >= 4 ? 'var(--warn)' : 'var(--loss)',
                        boxShadow: '0 0 6px rgba(52, 211, 153, 0.2)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                      Higher is better (7-10: Decisive execution)
                    </div>
                  </div>

                  {/* FOMO Cost Card */}
                  <div style={{ 
                    marginTop: 'auto',
                    padding: '10px 14px', 
                    background: stats.fomoCost > 0 ? 'var(--loss-soft)' : 'var(--profit-soft)', 
                    border: `1px solid ${stats.fomoCost > 0 ? 'var(--loss-border)' : 'var(--profit-border)'}`,
                    borderRadius: 'var(--r-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    {stats.fomoCost > 0 ? (
                      <>
                        <AlertTriangle size={16} style={{ color: 'var(--loss)', flexShrink: 0 }} />
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          Monday FOMO Cost: <strong style={{ color: 'var(--loss)' }}>-${stats.fomoCost.toFixed(2)}</strong> lost on high FOMO trades (FOMO &gt;= 7).
                        </div>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} style={{ color: 'var(--profit)', flexShrink: 0 }} />
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          Zero FOMO costs incurred! You did not trade impulsively on Mondays.
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Top Emotions & Mindsets */}
                <div className="glass" style={{ padding: 'var(--s5)', display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 'var(--s2)', margin: 0, color: 'var(--text-primary)' }}>
                    Monday Emotional States
                  </h3>

                  {stats.topTags.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 'var(--s4) 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      No emotion tags logged for Monday trades yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', justifyContent: 'center', flex: 1 }}>
                      {stats.topTags.map(([tag, count]) => {
                        const color = EMOTION_COLORS[tag] || 'var(--accent)';
                        const pct = Math.round((count / stats.totalTrades) * 100);
                        return (
                          <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span className="badge" style={{ 
                              background: `${color}15`, 
                              border: `1px solid ${color}40`, 
                              color: color, 
                              fontSize: '0.68rem',
                              width: '90px',
                              textAlign: 'center'
                            }}>
                              {tag}
                            </span>
                            <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: color }} />
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', minWidth: '42px', textAlign: 'right' }}>
                              {count} ({pct}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Monday Trades */}
              <div className="glass" style={{ padding: 'var(--s5)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Monday Trade History
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px 4px', fontWeight: 600 }}>Date</th>
                        <th style={{ padding: '8px 4px', fontWeight: 600 }}>Symbol</th>
                        <th style={{ padding: '8px 4px', fontWeight: 600 }}>Type</th>
                        <th style={{ padding: '8px 4px', fontWeight: 600 }}>FOMO</th>
                        <th style={{ padding: '8px 4px', fontWeight: 600 }}>Confidence</th>
                        <th style={{ padding: '8px 4px', fontWeight: 600, textAlign: 'right' }}>P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mondayTrades.slice(0, 5).map(trade => (
                        <tr key={trade.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '10px 4px', color: 'var(--text-secondary)' }}>
                            {trade.entryTime ? formatInNewYork(trade.entryTime, 'MMM d, yyyy') : '—'}
                          </td>
                          <td style={{ padding: '10px 4px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {trade.symbol}
                          </td>
                          <td style={{ padding: '10px 4px' }}>
                            <span className={`badge ${trade.type === 'Long' ? 'badge-profit' : 'badge-loss'}`} style={{ fontSize: '0.55rem', padding: '1px 6px' }}>
                              {trade.type}
                            </span>
                          </td>
                          <td style={{ padding: '10px 4px', color: (trade.fomoLevel || 5) >= 7 ? 'var(--loss)' : 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>
                            {trade.fomoLevel || 5}/10
                          </td>
                          <td style={{ padding: '10px 4px', color: (trade.confidenceLevel || 5) >= 7 ? 'var(--profit)' : 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>
                            {trade.confidenceLevel || 5}/10
                          </td>
                          <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 700, fontFamily: 'JetBrains Mono', color: trade.pnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                            {trade.pnl >= 0 ? '+' : ''}${Math.abs(trade.pnl).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="glass" style={{ padding: 'var(--s5)', display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Monday Notes & Reflections</h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>
                Write down checklists, rules, and reflections specifically for trading on Mondays.
              </p>
            </div>
            {saveStatus && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: saveStatus === 'saved' ? 'var(--profit)' : 'var(--text-tertiary)' }}>
                {saveStatus === 'saving' ? (
                  <>
                    <span className="status-dot live" style={{ background: 'var(--warn)', animation: 'pulse-glow 1s infinite' }} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={12} style={{ color: 'var(--profit)' }}/>
                    Saved ✓
                  </>
                )}
              </div>
            )}
          </div>

          <textarea
            className="input"
            rows={15}
            value={notesText}
            onChange={handleNotesChange}
            placeholder="Type your Monday trading rules, weekly preparation, levels to watch, or reflections here..."
            style={{ 
              background: 'var(--bg-primary)', 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--r-md)',
              padding: '14px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              lineHeight: 1.6,
              color: 'var(--text-primary)',
              resize: 'vertical',
              width: '100%',
              minHeight: '300px'
            }}
          />
        </div>
      )}

      {/* Lightbox Modal */}
      {lightbox && (
        <div className="modal-overlay" style={{ padding: 'var(--s8)' }} onClick={() => setLightbox(null)}>
          <div style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close glass" onClick={() => setLightbox(null)}
              style={{ position: 'absolute', top: -40, right: 0, padding: 'var(--s2) var(--s3)', borderRadius: 'var(--r-md)' }}>
              <X size={16}/> <span style={{ fontSize: '0.72rem', marginLeft: 4 }}>Close</span>
            </button>
            <div className="glass-deep" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
              <img src={lightbox.imageUrl} alt={lightbox.symbol}
                style={{ maxWidth: '100%', maxHeight: '75vh', display: 'block', borderRadius: 'var(--r-lg)' }}/>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--s4) var(--s2) var(--s2)', borderTop: '1px solid var(--border)', marginTop: 'var(--s4)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent)', marginBottom: 4 }}>{lightbox.symbol}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {lightbox.entryTime ? formatInNewYork(lightbox.entryTime, 'MMMM d, yyyy HH:mm') : ''}
                    {lightbox.setup && ` · ${lightbox.setup}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
                  <span className={`badge ${lightbox.type === 'Long' ? 'badge-profit' : 'badge-loss'}`}>{lightbox.type}</span>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', fontFamily: 'JetBrains Mono', color: lightbox.pnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                    {lightbox.pnl >= 0 ? '+' : ''}${Math.abs(lightbox.pnl).toFixed(2)}
                  </span>
                </div>
              </div>
              {lightbox.notes && (
                <div style={{ padding: 'var(--s3) var(--s2)', fontSize: '0.78rem', color: 'var(--text-tertiary)', lineHeight: 1.7, fontStyle: 'italic', borderTop: '1px solid var(--border)' }}>
                  "{lightbox.notes}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mondays;
