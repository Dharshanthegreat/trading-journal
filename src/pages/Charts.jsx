import React, { useState, useEffect, useMemo } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { Image as ImageIcon, X, ZoomIn, Calendar, TrendingUp, Plus, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { formatInNewYork, toNewYorkDatetimeString, parseNewYorkDatetimeToDate } from '../utils/timezone';

const SETUPS = ['FVG', 'SMT', 'OB', 'BB', 'IRL-ERL', 'ERL-IRL'];

const Charts = () => {
  const { trades, fetchTrades, addTrade, updateTrade } = useTrades();
  const [lightbox, setLightbox] = useState(null);

  // Add Chart modal states
  const [showAddChart, setShowAddChart] = useState(false);
  const [addMode, setAddMode] = useState('existing'); // 'existing' | 'new'
  const [selectedTradeId, setSelectedTradeId] = useState('');
  const [chartFile, setChartFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Default datetime for new trades (default to current New York time)
  const getDefaultDatetime = () => {
    return toNewYorkDatetimeString(new Date());
  };

  const [newTradeData, setNewTradeData] = useState({
    symbol: '',
    type: 'Long',
    pnl: '',
    entryTime: '',
    setup: '',
    notes: '',
  });

  // Reset entry time when modal is opened
  useEffect(() => {
    if (showAddChart) {
      setNewTradeData(prev => ({
        ...prev,
        entryTime: getDefaultDatetime()
      }));
    }
  }, [showAddChart]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setChartFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setChartFile(null);
      setImagePreview(null);
    }
  };

  const handleExistingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTradeId) {
      setErrorMsg('Please select a trade.');
      return;
    }
    if (!chartFile) {
      setErrorMsg('Please select a chart file.');
      return;
    }
    
    setIsSaving(true);
    setErrorMsg('');
    
    try {
      const trade = trades.find(t => String(t.id) === String(selectedTradeId));
      if (!trade) {
        throw new Error('Selected trade not found.');
      }
      
      const tradeData = {
        symbol: trade.symbol,
        type: trade.type || 'Long',
        entryPrice: trade.entryPrice !== undefined && trade.entryPrice !== null ? parseFloat(trade.entryPrice) : 0,
        exitPrice: trade.exitPrice !== undefined && trade.exitPrice !== null ? parseFloat(trade.exitPrice) : 0,
        lotSize: trade.lotSize !== undefined && trade.lotSize !== null ? parseFloat(trade.lotSize) : 0,
        stopLoss: trade.stopLoss !== undefined && trade.stopLoss !== null ? parseFloat(trade.stopLoss) : 0,
        takeProfit: trade.takeProfit !== undefined && trade.takeProfit !== null ? parseFloat(trade.takeProfit) : 0,
        pnl: trade.pnl !== undefined && trade.pnl !== null ? parseFloat(trade.pnl) : 0,
        entryTime: trade.entryTime ? new Date(trade.entryTime).toISOString() : new Date().toISOString(),
        exitTime: trade.exitTime ? new Date(trade.exitTime).toISOString() : '',
        setup: trade.setup || '',
        grade: trade.grade || 'B',
        notes: trade.notes || '',
        tags: Array.isArray(trade.tags) ? trade.tags : [],
        emotionTags: Array.isArray(trade.emotionTags) ? trade.emotionTags : [],
        fomoLevel: parseInt(trade.fomoLevel) || 5,
        confidenceLevel: parseInt(trade.confidenceLevel) || 5,
        accountId: trade.accountId || null,
        notionLink: trade.notionLink || '',
      };
      
      await updateTrade(trade.id, tradeData, [chartFile], trade.imageUrls || []);
      
      setShowAddChart(false);
      setSelectedTradeId('');
      setChartFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to attach chart.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewSubmit = async (e) => {
    e.preventDefault();
    if (!newTradeData.symbol) {
      setErrorMsg('Please enter a symbol.');
      return;
    }
    if (!chartFile) {
      setErrorMsg('Please select a chart file.');
      return;
    }
    
    setIsSaving(true);
    setErrorMsg('');
    
    try {
      const entryTimeDate = newTradeData.entryTime ? parseNewYorkDatetimeToDate(newTradeData.entryTime) : new Date();
      
      const tradeData = {
        symbol: newTradeData.symbol.toUpperCase(),
        type: newTradeData.type || 'Long',
        entryPrice: 0,
        exitPrice: 0,
        lotSize: 0,
        stopLoss: 0,
        takeProfit: 0,
        pnl: parseFloat(newTradeData.pnl) || 0,
        entryTime: entryTimeDate ? entryTimeDate.toISOString() : new Date().toISOString(),
        exitTime: '',
        setup: newTradeData.setup || '',
        grade: 'B',
        notes: newTradeData.notes || '',
        tags: [],
        emotionTags: [],
        fomoLevel: 5,
        confidenceLevel: 5,
        accountId: null,
        notionLink: '',
      };
      
      await addTrade(tradeData, [chartFile]);
      
      setShowAddChart(false);
      setNewTradeData({
        symbol: '',
        type: 'Long',
        pnl: '',
        entryTime: getDefaultDatetime(),
        setup: '',
        notes: '',
      });
      setChartFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to create new trade.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => { fetchTrades({ limit: 200 }); }, [fetchTrades]);

  const chartTrades = trades.filter(t => t.imageUrl);

  // Sort trades so that trades without charts are at the top of the dropdown select list
  const dropdownTrades = useMemo(() => {
    const noCharts = trades.filter(t => !t.imageUrl);
    const withCharts = trades.filter(t => t.imageUrl);
    return [...noCharts, ...withCharts];
  }, [trades]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="page-title"><ImageIcon size={18} style={{ opacity: 0.6 }}/> Chart Gallery</div>
          <div className="page-subtitle">{chartTrades.length} chart{chartTrades.length !== 1 ? 's' : ''} uploaded</div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddChart(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.72rem',
            fontWeight: 600,
            padding: '6px 12px',
            borderRadius: 'var(--r-md)',
            cursor: 'pointer'
          }}
        >
          <Plus size={12} /> Add Chart
        </button>
      </div>

      {chartTrades.length === 0 ? (
        <div className="glass empty-state" style={{ padding: 'var(--s12)' }}>
          <ImageIcon size={36} style={{ opacity: 0.25 }}/>
          <div className="empty-title">No charts uploaded</div>
          <div className="empty-desc">Attach chart screenshots when logging trades in the Journal to build your visual library.</div>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddChart(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: 'var(--r-md)',
              cursor: 'pointer',
              marginTop: 'var(--s6)'
            }}
          >
            <Plus size={14} /> Upload First Chart
          </button>
        </div>
      ) : (
        <div className="chart-gallery-grid">
          {chartTrades.map(trade => (
            <div key={trade.id} className="glass chart-thumb" onClick={() => setLightbox(trade)}>
              <img src={trade.imageUrl} alt={`${trade.symbol} chart`}/>
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

      {/* Add Chart Modal */}
      {showAddChart && (
        <div className="modal-overlay" onClick={() => setShowAddChart(false)}>
          <div className="glass-deep modal-panel" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} style={{ color: 'var(--accent)' }}/>
                <span>Add Chart</span>
              </div>
              <button className="modal-close" onClick={() => setShowAddChart(false)}><X size={18}/></button>
            </div>
            
            {/* Modal Tabs */}
            <div className="glass" style={{ display: 'flex', padding: '3px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', marginBottom: 'var(--s5)' }}>
              {[
                { id: 'existing', label: 'Attach to Existing Trade' },
                { id: 'new', label: 'Create New Trade' }
              ].map(mode => (
                <button
                  type="button"
                  key={mode.id}
                  onClick={() => {
                    setAddMode(mode.id);
                    setErrorMsg('');
                  }}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: addMode === mode.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: addMode === mode.id ? 'var(--bg-hover)' : 'transparent',
                    border: 'none',
                    borderRadius: 'var(--r-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <form onSubmit={addMode === 'existing' ? handleExistingSubmit : handleNewSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
                {errorMsg && (
                  <div style={{ color: 'var(--loss)', fontSize: '0.75rem', fontWeight: 600, padding: '8px 12px', background: 'var(--loss-soft)', border: '1px solid var(--loss-border)', borderRadius: 'var(--r-md)' }}>
                    {errorMsg}
                  </div>
                )}

                {addMode === 'existing' ? (
                  <div className="form-field">
                    <label className="form-label">Select Trade *</label>
                    <select
                      className="input"
                      value={selectedTradeId}
                      onChange={e => setSelectedTradeId(e.target.value)}
                      required
                      style={{ width: '100%', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    >
                      <option value="">— Choose a Trade —</option>
                      {dropdownTrades.map(t => {
                        const dateFormatted = t.entryTime ? formatInNewYork(t.entryTime, 'MMM d, yyyy') : '—';
                        const chartStatus = t.imageUrl ? '🖼️ Has chart' : '❌ No chart';
                        return (
                          <option key={t.id} value={t.id}>
                            {dateFormatted} · {t.symbol} ({t.type}) · {t.pnl >= 0 ? '+' : ''}${t.pnl} · {chartStatus}
                          </option>
                        );
                      })}
                    </select>
                    {dropdownTrades.length === 0 && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
                        No trades found. You can log one in the Journal or use the 'Create New Trade' tab.
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
                      <div className="form-field">
                        <label className="form-label">Symbol *</label>
                        <input
                          required
                          className="input"
                          placeholder="EURUSD"
                          value={newTradeData.symbol}
                          onChange={e => setNewTradeData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                        />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Direction *</label>
                        <select
                          className="input"
                          value={newTradeData.type}
                          onChange={e => setNewTradeData(prev => ({ ...prev, type: e.target.value }))}
                        >
                          <option value="Long">Long ↑</option>
                          <option value="Short">Short ↓</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
                      <div className="form-field">
                        <label className="form-label">Net P&L ($) *</label>
                        <input
                          required
                          className="input"
                          type="number"
                          step="any"
                          placeholder="150.00"
                          value={newTradeData.pnl}
                          onChange={e => setNewTradeData(prev => ({ ...prev, pnl: e.target.value }))}
                        />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Entry Time *</label>
                        <input
                          required
                          className="input"
                          type="datetime-local"
                          value={newTradeData.entryTime}
                          onChange={e => setNewTradeData(prev => ({ ...prev, entryTime: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="form-field">
                      <label className="form-label">Setup</label>
                      <select
                        className="input"
                        value={newTradeData.setup}
                        onChange={e => setNewTradeData(prev => ({ ...prev, setup: e.target.value }))}
                      >
                        <option value="">— Select Setup —</option>
                        {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div className="form-field">
                      <label className="form-label">Notes</label>
                      <textarea
                        className="input"
                        placeholder="Trade reflections or setup notes..."
                        rows={2}
                        value={newTradeData.notes}
                        onChange={e => setNewTradeData(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                <div className="form-field full">
                  <label className="form-label">Chart Screenshot *</label>
                  <label style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--s2)',
                    padding: '20px', border: '1px dashed var(--border-mid)',
                    borderRadius: 'var(--r-md)', cursor: 'pointer',
                    fontSize: '0.75rem', color: 'var(--text-muted)',
                    transition: 'border-color var(--t-fast)', background: 'var(--surface-glass)',
                    textAlign: 'center'
                  }}>
                    <Upload size={20} style={{ opacity: 0.6 }}/>
                    {chartFile ? (
                      <div style={{ color: 'var(--accent)', fontWeight: 600 }}>{chartFile.name}</div>
                    ) : (
                      <div>Click to select or drag chart image here (PNG, JPG, WEBP)</div>
                    )}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} required={!chartFile}/>
                  </label>
                  {imagePreview && (
                    <div style={{ marginTop: '10px', textAlign: 'center' }}>
                      <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }} />
                    </div>
                  )}
                </div>

                <div className="form-actions" style={{ marginTop: 'var(--s2)' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowAddChart(false)} disabled={isSaving}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Add Chart'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Charts;
