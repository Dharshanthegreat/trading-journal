import React, { useState, useEffect } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { Image as ImageIcon, X, ZoomIn, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

const Charts = () => {
  const { trades, fetchTrades } = useTrades();
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => { fetchTrades({ limit: 200 }); }, [fetchTrades]);

  const chartTrades = trades.filter(t => t.imageUrl);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
      <div className="page-header">
        <div className="page-title"><ImageIcon size={18} style={{ opacity: 0.6 }}/> Chart Gallery</div>
        <div className="page-subtitle">{chartTrades.length} chart{chartTrades.length !== 1 ? 's' : ''} uploaded</div>
      </div>

      {chartTrades.length === 0 ? (
        <div className="glass empty-state" style={{ padding: 'var(--s12)' }}>
          <ImageIcon size={36} style={{ opacity: 0.25 }}/>
          <div className="empty-title">No charts uploaded</div>
          <div className="empty-desc">Attach chart screenshots when logging trades in the Journal to build your visual library.</div>
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
                      {trade.entryTime ? format(new Date(trade.entryTime), 'MMM d, yyyy') : '—'}
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
                    {lightbox.entryTime ? format(new Date(lightbox.entryTime), 'MMMM d, yyyy HH:mm') : ''}
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

export default Charts;
