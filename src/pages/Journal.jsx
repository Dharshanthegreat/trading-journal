import React, { useState, useEffect, useMemo } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { format } from 'date-fns';
import {
  Plus, X, Search, Trash2,
  ArrowUpRight, ArrowDownRight,
  Upload, FileText, Share2, Copy, Check, ExternalLink, ZoomIn
} from 'lucide-react';

const EMOTIONS = ['Calm', 'Confident', 'Anxious', 'Fearful', 'Greedy', 'FOMO', 'Disciplined', 'Revenge'];
const SETUPS = ['Breakout', 'Pullback', 'Reversal', 'Range', 'Trend Follow', 'Scalp', 'News', 'Other'];

const defaultForm = () => ({
  symbol: '', type: 'Long', entryPrice: '', exitPrice: '', lotSize: '',
  stopLoss: '', takeProfit: '', pnl: '',
  entryTime: new Date().toISOString().slice(0, 16), exitTime: '',
  setup: '', notes: '', tags: '', emotionTags: [],
  fomoLevel: 5, confidenceLevel: 5, grade: 'B',
});

const Journal = () => {
  const { trades, loading, addTrade, deleteTrade, fetchTrades, shareTrade, unshareTrade } = useTrades();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(defaultForm());
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [saving, setSaving] = useState(false);
  const [chartFile, setChartFile] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [zoomImage, setZoomImage] = useState(false);

  useEffect(() => {
    fetchTrades({ limit: 200 });
  }, [fetchTrades]);

  // Sync selectedTrade state if trades are updated in the background/context
  const currentSelectedTrade = useMemo(() => {
    if (!selectedTrade) return null;
    return trades.find(t => t.id === selectedTrade.id) || selectedTrade;
  }, [trades, selectedTrade]);

  const handleShare = async () => {
    if (!currentSelectedTrade) return;
    try {
      const token = await shareTrade(currentSelectedTrade.id);
      setSelectedTrade(prev => prev ? { ...prev, shareToken: token } : null);
    } catch (err) {
      console.error('Failed to share trade:', err);
    }
  };

  const handleUnshare = async () => {
    if (!currentSelectedTrade) return;
    try {
      await unshareTrade(currentSelectedTrade.id);
      setSelectedTrade(prev => prev ? { ...prev, shareToken: null } : null);
    } catch (err) {
      console.error('Failed to unshare trade:', err);
    }
  };

  const filtered = useMemo(() => {
    return trades.filter(t => {
      const q = search.toLowerCase();
      const matchSearch = !q || t.symbol?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q) || t.setup?.toLowerCase().includes(q);
      const matchType = filterType === 'All' || t.type === filterType ||
        (filterType === 'Win' && t.pnl > 0) ||
        (filterType === 'Loss' && t.pnl < 0);
      return matchSearch && matchType;
    });
  }, [trades, search, filterType]);

  const toggleEmotion = (e) => {
    setFormData(prev => ({
      ...prev,
      emotionTags: prev.emotionTags.includes(e)
        ? prev.emotionTags.filter(x => x !== e)
        : [...prev.emotionTags, e]
    }));
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      await addTrade({
        symbol: formData.symbol,
        type: formData.type,
        entryPrice: parseFloat(formData.entryPrice) || 0,
        exitPrice: parseFloat(formData.exitPrice) || 0,
        lotSize: parseFloat(formData.lotSize) || 0,
        stopLoss: parseFloat(formData.stopLoss) || 0,
        takeProfit: parseFloat(formData.takeProfit) || 0,
        pnl: parseFloat(formData.pnl) || 0,
        entryTime: formData.entryTime ? new Date(formData.entryTime).toISOString() : new Date().toISOString(),
        exitTime: formData.exitTime ? new Date(formData.exitTime).toISOString() : '',
        setup: formData.setup,
        grade: formData.grade,
        notes: formData.notes,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        emotionTags: formData.emotionTags,
        fomoLevel: formData.fomoLevel,
        confidenceLevel: formData.confidenceLevel,
      }, chartFile);
      setShowForm(false);
      setFormData(defaultForm());
      setChartFile(null);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (id) => {
    await deleteTrade(id);
    setDeleteConfirm(null);
  };

  const totalPnL = filtered.reduce((a, t) => a + (t.pnl || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-title">Trade Journal</div>
          <div className="page-subtitle">{filtered.length} trades · Net P&L: <span style={{ color: totalPnL >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{totalPnL >= 0 ? '+' : ''}${Math.abs(totalPnL).toFixed(2)}</span></div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={15}/> Add Trade
        </button>
      </div>

      <div className="journal-toolbar" style={{ marginBottom: 0 }}>
        <div className="journal-filters">
          <div className="search-box">
            <Search size={13} className="search-icon"/>
            <input className="input" placeholder="Search symbol, notes..." style={{ paddingLeft: '2rem', width: 240 }} value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <div style={{ display: 'flex', gap: 'var(--s2)' }}>
            {['All', 'Long', 'Short', 'Win', 'Loss'].map(f => (
              <button key={f} onClick={() => setFilterType(f)} className={`btn btn-sm ${filterType === f ? 'btn-primary' : 'btn-ghost'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 800 }}>
            <thead>
              <tr>
                <th>Date</th><th>Symbol</th><th>Dir.</th><th>Entry</th><th>Exit</th>
                <th>Lot</th><th>Setup</th><th>P&L</th><th>Grade</th><th>Notes</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading && !trades.length ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(11)].map((_, j) => (<td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }}/></td>))}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <div className="empty-state">
                      <FileText size={28} style={{ opacity: 0.3 }}/>
                      <div className="empty-title">No trades found</div>
                      <div className="empty-desc">Add your first trade or import from MT5</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(t => (
                  <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedTrade(t)}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {t.entryTime ? format(new Date(t.entryTime), 'MMM d, yy HH:mm') : '—'}
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent)' }}>{t.symbol}</td>
                    <td>
                      <span className={`badge ${t.type === 'Long' ? 'badge-profit' : 'badge-loss'}`}>
                        {t.type === 'Long' ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}
                        {t.type}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono' }}>{t.entryPrice || '—'}</td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono' }}>{t.exitPrice || '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.lotSize || '—'}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{t.setup || '—'}</td>
                    <td style={{
                      fontWeight: 700, fontSize: '0.82rem', fontFamily: 'JetBrains Mono',
                      color: t.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', whiteSpace: 'nowrap'
                    }}>
                      {t.pnl >= 0 ? '+' : ''}${Math.abs(t.pnl).toFixed(2)}
                    </td>
                    <td><span className="badge badge-accent" style={{ fontSize: '0.6rem' }}>{t.grade || '—'}</span></td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.notes || '—'}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="trade-row-actions">
                        <button className="icon-btn" onClick={() => setDeleteConfirm(t.id)} title="Delete" style={{ color: 'var(--loss)' }}>
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Trade Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="glass-deep modal-panel">
            <div className="modal-header">
              <div className="modal-title">Log New Trade</div>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">Symbol *</label>
                  <input required className="input" placeholder="EURUSD" value={formData.symbol} onChange={e => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}/>
                </div>
                <div className="form-field">
                  <label className="form-label">Direction *</label>
                  <select className="input" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                    <option value="Long">Long ↑</option>
                    <option value="Short">Short ↓</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Entry Price</label>
                  <input className="input" type="number" step="any" placeholder="1.0850" value={formData.entryPrice} onChange={e => setFormData({ ...formData, entryPrice: e.target.value })}/>
                </div>
                <div className="form-field">
                  <label className="form-label">Exit Price</label>
                  <input className="input" type="number" step="any" placeholder="1.0900" value={formData.exitPrice} onChange={e => setFormData({ ...formData, exitPrice: e.target.value })}/>
                </div>
                <div className="form-field">
                  <label className="form-label">Stop Loss</label>
                  <input className="input" type="number" step="any" placeholder="1.0820" value={formData.stopLoss} onChange={e => setFormData({ ...formData, stopLoss: e.target.value })}/>
                </div>
                <div className="form-field">
                  <label className="form-label">Take Profit</label>
                  <input className="input" type="number" step="any" placeholder="1.0950" value={formData.takeProfit} onChange={e => setFormData({ ...formData, takeProfit: e.target.value })}/>
                </div>
                <div className="form-field">
                  <label className="form-label">Lot Size</label>
                  <input className="input" type="number" step="any" placeholder="0.10" value={formData.lotSize} onChange={e => setFormData({ ...formData, lotSize: e.target.value })}/>
                </div>
                <div className="form-field">
                  <label className="form-label">Net P&L ($) *</label>
                  <input required className="input" type="number" step="any" placeholder="250.00" value={formData.pnl} onChange={e => setFormData({ ...formData, pnl: e.target.value })}/>
                </div>
                <div className="form-field">
                  <label className="form-label">Entry Time</label>
                  <input className="input" type="datetime-local" value={formData.entryTime} onChange={e => setFormData({ ...formData, entryTime: e.target.value })}/>
                </div>
                <div className="form-field">
                  <label className="form-label">Exit Time</label>
                  <input className="input" type="datetime-local" value={formData.exitTime} onChange={e => setFormData({ ...formData, exitTime: e.target.value })}/>
                </div>
                <div className="form-field">
                  <label className="form-label">Setup</label>
                  <select className="input" value={formData.setup} onChange={e => setFormData({ ...formData, setup: e.target.value })}>
                    <option value="">— Select —</option>
                    {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Trade Grade</label>
                  <select className="input" value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })}>
                    {['A+', 'A', 'B', 'C', 'D'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div className="form-field full">
                  <label className="form-label">Emotional State</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)' }}>
                    {EMOTIONS.map(e => (
                      <button key={e} type="button" onClick={() => toggleEmotion(e)}
                        className={`btn btn-sm ${formData.emotionTags.includes(e) ? 'btn-primary' : 'btn-ghost'}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">FOMO Level: <span style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono' }}>{formData.fomoLevel}/10</span></label>
                  <input type="range" className="slider" min="1" max="10" value={formData.fomoLevel} onChange={e => setFormData({ ...formData, fomoLevel: +e.target.value })}/>
                </div>
                <div className="form-field">
                  <label className="form-label">Confidence: <span style={{ color: 'var(--profit)', fontFamily: 'JetBrains Mono' }}>{formData.confidenceLevel}/10</span></label>
                  <input type="range" className="slider" min="1" max="10" value={formData.confidenceLevel} onChange={e => setFormData({ ...formData, confidenceLevel: +e.target.value })}/>
                </div>

                <div className="form-field full">
                  <label className="form-label">Journal Notes</label>
                  <textarea className="input" placeholder="What happened? What did you do well? What to improve?" rows={3} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}/>
                </div>

                <div className="form-field">
                  <label className="form-label">Tags (comma separated)</label>
                  <input className="input" placeholder="london session, breakout" value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })}/>
                </div>

                <div className="form-field">
                  <label className="form-label">Chart Screenshot</label>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--s2)',
                    padding: '8px 12px', border: '1px dashed var(--border-mid)',
                    borderRadius: 'var(--r-md)', cursor: 'pointer',
                    fontSize: '0.75rem', color: 'var(--text-muted)',
                    transition: 'border-color var(--t-fast)', background: 'var(--surface-glass)',
                  }}>
                    <Upload size={13}/>
                    {chartFile ? chartFile.name : 'Attach PNG / JPG'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setChartFile(e.target.files[0])}/>
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : '+ Log Trade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trade Details & Share Modal */}
      {currentSelectedTrade && (
        <div className="modal-overlay" onClick={() => setSelectedTrade(null)}>
          <div className="glass-deep modal-panel" style={{ width: 840, maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--s4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
                <span className={`badge ${currentSelectedTrade.type === 'Long' ? 'badge-profit' : 'badge-loss'}`} style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                  {currentSelectedTrade.type}
                </span>
                <span className="modal-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>{currentSelectedTrade.symbol}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {currentSelectedTrade.entryTime ? format(new Date(currentSelectedTrade.entryTime), 'MMM d, yyyy HH:mm') : '—'}
                </span>
              </div>
              <button className="modal-close" onClick={() => setSelectedTrade(null)}><X size={18}/></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--s6)', overflowY: 'auto', maxHeight: '70vh', paddingRight: 'var(--s2)' }}>
              {/* Left Column: Stats and Screenshot */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s3)' }}>
                  <div className="glass-deep" style={{ padding: 'var(--s3)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Net Return</div>
                    <div style={{ fontWeight: 800, color: currentSelectedTrade.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono', fontSize: '1.1rem', marginTop: 2 }}>
                      {currentSelectedTrade.pnl >= 0 ? '+' : ''}${Math.abs(currentSelectedTrade.pnl).toFixed(2)}
                    </div>
                  </div>
                  <div className="glass-deep" style={{ padding: 'var(--s3)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Entry Price</div>
                    <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: '1.0rem', marginTop: 2 }}>
                      {currentSelectedTrade.entryPrice || '—'}
                    </div>
                  </div>
                  <div className="glass-deep" style={{ padding: 'var(--s3)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Exit Price</div>
                    <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: '1.0rem', marginTop: 2 }}>
                      {currentSelectedTrade.exitPrice || '—'}
                    </div>
                  </div>
                  <div className="glass-deep" style={{ padding: 'var(--s3)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Volume</div>
                    <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: '1.0rem', marginTop: 2 }}>
                      {currentSelectedTrade.lotSize || '—'}
                    </div>
                  </div>
                  <div className="glass-deep" style={{ padding: 'var(--s3)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Stop Loss</div>
                    <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: '1.0rem', marginTop: 2 }}>
                      {currentSelectedTrade.stopLoss || '—'}
                    </div>
                  </div>
                  <div className="glass-deep" style={{ padding: 'var(--s3)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Take Profit</div>
                    <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: '1.0rem', marginTop: 2 }}>
                      {currentSelectedTrade.takeProfit || '—'}
                    </div>
                  </div>
                </div>

                {/* Screenshot Chart */}
                {currentSelectedTrade.imageUrl ? (
                  <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-lg)', background: '#0e1017', border: '1px solid var(--border)', aspectRatio: '16/10' }}>
                    <img src={currentSelectedTrade.imageUrl} alt="Trade Chart" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => setZoomImage(true)} className="btn btn-sm btn-ghost" style={{ position: 'absolute', right: 8, bottom: 8, background: 'var(--surface-glass)', padding: '4px 8px', fontSize: '0.68rem', gap: '4px' }}>
                      <ZoomIn size={12}/> View Chart
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, borderRadius: 'var(--r-lg)', border: '1px dashed var(--border)', color: 'var(--text-tertiary)', gap: 'var(--s2)' }}>
                    <FileText size={24} style={{ opacity: 0.2 }}/>
                    <span style={{ fontSize: '0.72rem' }}>No screenshot uploaded for this trade</span>
                  </div>
                )}

                {/* Notes */}
                <div className="glass-deep" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-lg)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--s2)', fontWeight: 600 }}>Notes</div>
                  <div style={{ fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    {currentSelectedTrade.notes || 'No notes logged.'}
                  </div>
                </div>
              </div>

              {/* Right Column: Parameters, Emotions & Sharing */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
                {/* Parameters */}
                <div className="glass-deep" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-lg)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--s3)', fontWeight: 600 }}>Parameters</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                    {[
                      { label: 'Setup / Strategy', value: currentSelectedTrade.setup || '—' },
                      { label: 'Grade', value: <span className="badge badge-accent" style={{ fontSize: '0.6rem' }}>{currentSelectedTrade.grade || '—'}</span> },
                      { label: 'Exit Time', value: currentSelectedTrade.exitTime ? format(new Date(currentSelectedTrade.exitTime), 'MMM d, HH:mm') : '—' },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', paddingBottom: 'var(--s1.5)', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                        <span style={{ fontWeight: 600 }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Psychology & Tags */}
                <div className="glass-deep" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--s3.5)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Psychology & Tags</div>
                  
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>FOMO Level</span>
                      <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{currentSelectedTrade.fomoLevel}/10</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${currentSelectedTrade.fomoLevel * 10}%`, background: 'var(--accent)', borderRadius: 2 }}/>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Confidence Level</span>
                      <span style={{ fontWeight: 700, color: 'var(--profit)' }}>{currentSelectedTrade.confidenceLevel}/10</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${currentSelectedTrade.confidenceLevel * 10}%`, background: 'var(--profit)', borderRadius: 2 }}/>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>Emotions</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {currentSelectedTrade.emotionTags && currentSelectedTrade.emotionTags.length > 0 ? (
                        currentSelectedTrade.emotionTags.map(tag => (
                          <span key={tag} className="badge badge-accent" style={{ fontSize: '0.62rem', padding: '2px 6px' }}>{tag}</span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>None</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sharing Dashboard */}
                <div className="glass" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid rgba(167,139,250,0.15)', background: 'linear-gradient(135deg, rgba(167,139,250,0.02) 0%, var(--surface) 100%)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s3)' }}>
                    <Share2 size={13} style={{ color: 'var(--accent)' }}/>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>Share Trade</span>
                  </div>

                  {currentSelectedTrade.shareToken ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                      <div style={{ display: 'flex', gap: 'var(--s2)' }}>
                        <input
                          readOnly
                          className="input"
                          style={{ fontSize: '0.72rem', height: 32, flex: 1, textOverflow: 'ellipsis', background: 'rgba(0,0,0,0.2)' }}
                          value={`${window.location.origin}/shared/trade/${currentSelectedTrade.shareToken}`}
                          onClick={e => e.target.select()}
                        />
                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ height: 32, width: 36, padding: 0 }}
                          onClick={async () => {
                            await navigator.clipboard.writeText(`${window.location.origin}/shared/trade/${currentSelectedTrade.shareToken}`);
                            setCopySuccess(true);
                            setTimeout(() => setCopySuccess(false), 2000);
                          }}
                          title="Copy to Clipboard"
                        >
                          {copySuccess ? <Check size={14} style={{ color: 'var(--profit)' }}/> : <Copy size={14}/>}
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--s2)' }}>
                        <a
                          href={`/shared/trade/${currentSelectedTrade.shareToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-ghost"
                          style={{ fontSize: '0.72rem', flex: 1, gap: '4px', height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          View Public Page <ExternalLink size={11}/>
                        </a>
                        <button
                          className="btn btn-sm btn-danger"
                          style={{ fontSize: '0.72rem', flex: 1, height: 30 }}
                          onClick={handleUnshare}
                        >
                          Make Private
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 'var(--s3)' }}>
                        Generate a secure public link to share this trade report with others. You can revoke it at any time.
                      </p>
                      <button className="btn btn-sm btn-primary" style={{ width: '100%', fontSize: '0.72rem', height: 32 }} onClick={handleShare}>
                        Create Shareable Link
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Zoom View */}
      {zoomImage && currentSelectedTrade && currentSelectedTrade.imageUrl && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5,6,8,0.95)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 10000, padding: 'var(--s8)'
        }} onClick={() => setZoomImage(false)}>
          <button style={{
            position: 'absolute', top: 20, right: 20, background: 'var(--surface-glass)',
            border: 'none', color: '#fff', width: 40, height: 40, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }} onClick={() => setZoomImage(false)}>
            <X size={20}/>
          </button>
          <img
            src={currentSelectedTrade.imageUrl}
            alt="Zoomed chart screenshot"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 'var(--r-lg)' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="glass-deep modal-panel" style={{ width: 380, padding: 'var(--s8)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title" style={{ marginBottom: 'var(--s4)' }}>Delete Trade?</div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 'var(--s6)', lineHeight: 1.7 }}>
              This will permanently remove this trade from your journal.
            </p>
            <div style={{ display: 'flex', gap: 'var(--s3)', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => confirmDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Journal;
