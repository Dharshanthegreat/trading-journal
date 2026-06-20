import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { trades as tradesApi } from '../services/api';
import { format } from 'date-fns';
import { formatInNewYork } from '../utils/timezone';
import {
  TrendingUp, TrendingDown, Clock, Activity, Zap,
  AlertCircle, DollarSign, Calendar, ExternalLink, ZoomIn, X,
  Sun, Moon, Leaf, Compass, SunDim, Check, Palette, Shield, Sparkles,
  Paintbrush, Layers, Cpu, Grid, Droplet, Square
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const SharedTrade = () => {
  const { token } = useParams();
  const { theme, setTheme } = useTheme();
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  useEffect(() => {
    setActiveImageIdx(0);
  }, [trade]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClose = () => setDropdownOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [dropdownOpen]);

  useEffect(() => {
    const fetchSharedTrade = async () => {
      try {
        setLoading(true);
        const data = await tradesApi.getShared(token);
        setTrade(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching shared trade:', err);
        setError('This shared trade link is invalid, has expired, or has been made private.');
      } finally {
        setLoading(false);
      }
    };
    fetchSharedTrade();
  }, [token]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', flexDirection: 'column', gap: 'var(--s4)',
        color: 'var(--text-muted)', background: 'var(--bg-primary)',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div className="logo-icon anim-rotate" style={{
          width: 40, height: 40, borderRadius: 'var(--r-lg)',
          background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Activity size={20} color="#fff"/>
        </div>
        <span>Retrieving shared trade report...</span>
      </div>
    );
  }

  if (error || !trade) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', flexDirection: 'column', padding: 'var(--s8)',
        background: 'var(--bg-primary)', color: 'var(--text-primary)',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div className="glass-deep text-center" style={{ maxWidth: 460, padding: 'var(--s8)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)' }}>
          <AlertCircle size={40} style={{ color: 'var(--loss)', marginBottom: 'var(--s4)' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--s2)' }}>Link Unreachable</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 'var(--s6)' }}>
            {error || 'The requested trade could not be found.'}
          </p>
          <a href="/" className="btn btn-primary" style={{ display: 'inline-flex', width: 'auto', margin: '0 auto' }}>
            Go to Trading Journal
          </a>
        </div>
      </div>
    );
  }

  const pnl = trade.pnl || 0;
  const isWin = pnl >= 0;
  const lotSize = trade.lotSize || 0;
  const rr = (trade.entryPrice && trade.exitPrice && trade.stopLoss) 
    ? Math.abs((trade.exitPrice - trade.entryPrice) / (trade.entryPrice - trade.stopLoss)).toFixed(2)
    : '—';

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif',
      padding: 'var(--s8) var(--s4) var(--s12) var(--s4)'
    }}>
      {/* Container wrapper */}
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        
        {/* Header Branding */}
        <header className="glass" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: 'var(--s3) var(--s5)', border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
            <div className="logo-icon" style={{ width: 28, height: 28, borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent)', boxShadow: 'none' }}>
              <Activity size={13} color="#fff"/>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                Trading Journal
                <span className="badge badge-accent" style={{ fontSize: '0.58rem', padding: '1px 6px', borderRadius: 4 }}>Shared Report</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Logged on {trade.entryTime ? formatInNewYork(trade.entryTime, 'MMMM d, yyyy HH:mm') : '—'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2.5)', position: 'relative' }}>
            {/* Custom Theme Selector */}
            <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  height: '28px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)'
                }}
                title="Choose Theme"
              >
                {theme === 'dark' && <Moon size={11} />}
                {theme === 'minimal' && <Palette size={11} />}
                {theme === 'claymorphism' && <Paintbrush size={11} />}
                <span style={{ fontSize: '0.68rem', fontWeight: 500 }}>
                  {theme === 'dark' && 'Dark'}
                  {theme === 'minimal' && 'Minimal'}
                  {theme === 'claymorphism' && 'Clay'}
                </span>
              </button>

              {dropdownOpen && (
                <div
                  className="glass anim-fade-up"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    width: '150px',
                    zIndex: 1000,
                    padding: '4px',
                    boxShadow: 'var(--shadow-lg)',
                    borderRadius: 'var(--r-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-mid)'
                  }}
                >
                  {[
                    { id: 'dark', name: 'Dark Theme', icon: <Moon size={11} />, accent: '#818cf8' },
                    { id: 'minimal', name: 'Minimalist', icon: <Palette size={11} />, accent: '#000000' },
                    { id: 'claymorphism', name: 'Claymorphism', icon: <Paintbrush size={11} />, accent: '#6366f1' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTheme(t.id);
                        setDropdownOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '5px 7px',
                        borderRadius: 'var(--r-sm)',
                        border: 'none',
                        background: theme === t.id ? 'var(--bg-active)' : 'transparent',
                        color: theme === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background var(--t-fast)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = theme === t.id ? 'var(--bg-active)' : 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', color: theme === t.id ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                          {t.icon}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: theme === t.id ? 600 : 400 }}>{t.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: t.accent,
                          border: `1px solid ${t.id === 'light' ? 'rgba(0,0,0,0.1)' : 'transparent'}`
                        }} />
                        {theme === t.id && <Check size={10} style={{ color: 'var(--accent)' }} />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <a href="/" className="btn btn-sm btn-ghost" style={{ gap: 'var(--s1.5)', fontSize: '0.72rem', borderRadius: 'var(--r-sm)', padding: '5px 10px', height: '28px', display: 'flex', alignItems: 'center' }}>
              Join Trading Journal <ExternalLink size={11}/>
            </a>
          </div>
        </header>

        {/* Main P&L Showcase Card */}
        <div className="glass" style={{
          display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 'var(--s8)',
          padding: 'var(--s6) var(--s8)', border: '1px solid var(--border)',
          borderLeft: `4px solid ${isWin ? 'var(--profit)' : 'var(--loss)'}`,
          background: 'var(--bg-secondary)', alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2.5)', marginBottom: 'var(--s2)' }}>
              <span className={`badge ${trade.type === 'Long' ? 'badge-profit' : 'badge-loss'}`} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4 }}>
                {trade.type}
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{trade.symbol}</span>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Net Return</div>
            <div style={{
              fontSize: '2.5rem', fontWeight: 700, fontFamily: 'JetBrains Mono',
              color: isWin ? 'var(--profit)' : 'var(--loss)', letterSpacing: '-0.03em', lineHeight: 1.1
            }}>
              {isWin ? '+' : ''}${Math.abs(pnl).toFixed(2)}
            </div>
          </div>

          {/* Simple Clean Parameters List */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--s4)' }}>
            {[
              { label: 'Entry Price', value: trade.entryPrice },
              { label: 'Exit Price', value: trade.exitPrice },
              { label: 'Volume', value: `${lotSize} ${lotSize === 1 ? 'Lot' : 'Lots'}` },
              { label: 'Reward : Risk', value: rr !== '—' ? `${rr} R` : '—' },
            ].map(x => (
              <div key={x.label} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--s2)' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{x.label}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)', marginTop: 2 }}>{x.value || '—'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Metrics & Psychological State */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--s5)' }}>
          {/* Left Column: Trade details & Screenshot */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
            
            {/* Screenshot Panel */}
            {trade.imageUrls && trade.imageUrls.length > 0 ? (
              <div className="glass" style={{ padding: 'var(--s4)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s3)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Chart Screenshot</span>
                  <button onClick={() => setZoomImage(trade.imageUrls[activeImageIdx])} className="btn btn-sm btn-ghost" style={{ padding: '3px 8px', gap: '4px', fontSize: '0.68rem', borderRadius: 'var(--r-sm)' }}>
                    <ZoomIn size={11}/> Zoom
                  </button>
                </div>
                <div style={{ overflow: 'hidden', borderRadius: 'var(--r-sm)', cursor: 'pointer', aspectRatio: '16/10', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setZoomImage(trade.imageUrls[activeImageIdx])}>
                  <img
                    src={trade.imageUrls[activeImageIdx]}
                    alt={`${trade.symbol} trade chart`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                {trade.imageUrls.length > 1 && (
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '8px 0 4px 0' }}>
                    {trade.imageUrls.map((url, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveImageIdx(idx)}
                        style={{
                          width: 60, height: 40, borderRadius: 'var(--r-sm)', overflow: 'hidden',
                          border: activeImageIdx === idx ? '2px solid var(--accent)' : '1px solid var(--border-mid)',
                          cursor: 'pointer', opacity: activeImageIdx === idx ? 1 : 0.6,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <img src={url} alt={`Thumbnail ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="glass" style={{
                padding: 'var(--s6)', border: '1px dashed var(--border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--s2)',
                color: 'var(--text-tertiary)', aspectRatio: '16/10'
              }}>
                <Activity size={20} style={{ opacity: 0.15 }}/>
                <span style={{ fontSize: '0.7rem' }}>No chart screenshot attached to this trade</span>
              </div>
            )}

            {/* Notes Panel */}
            <div className="glass" style={{ padding: 'var(--s5)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 'var(--s3)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Trade Commentary
              </div>
              <div style={{
                fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.15)', padding: 'var(--s3.5)',
                borderRadius: 'var(--r-sm)', borderLeft: '2.5px solid var(--accent)', border: '1px solid var(--border)'
              }}>
                {trade.notes || 'The trader did not include any commentary for this trade.'}
              </div>
            </div>
          </div>

          {/* Right Column: Performance & Psychological Profile */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
            
            {/* Parameter Card */}
            <div className="glass" style={{ padding: 'var(--s5)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 'var(--s3.5)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Trade Parameters
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                {[
                  { label: 'Setup / Strategy', value: trade.setup || '—' },
                  { label: 'Stop Loss', value: trade.stopLoss ? `$${trade.stopLoss}` : '—' },
                  { label: 'Take Profit', value: trade.takeProfit ? `$${trade.takeProfit}` : '—' },
                  { label: 'Execution Grade', value: <span className="badge badge-accent" style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: 4 }}>{trade.grade || '—'}</span> },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', paddingBottom: 'var(--s1.5)', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                    <span style={{ fontWeight: 600 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Psychology Card */}
            <div className="glass" style={{ padding: 'var(--s5)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 'var(--s4)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Psychological Profile
              </div>

              {/* FOMO Level */}
              <div style={{ marginBottom: 'var(--s4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>FOMO Index</span>
                  <span style={{ fontWeight: 700, color: 'var(--loss)' }}>{trade.fomoLevel || 5} / 10</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${(trade.fomoLevel || 5) * 10}%`,
                    background: 'var(--loss)',
                    borderRadius: 2
                  }}/>
                </div>
              </div>

              {/* Confidence Level */}
              <div style={{ marginBottom: 'var(--s4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Execution Confidence</span>
                  <span style={{ fontWeight: 700, color: 'var(--profit)' }}>{trade.confidenceLevel || 5} / 10</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${(trade.confidenceLevel || 5) * 10}%`,
                    background: 'var(--profit)',
                    borderRadius: 2
                  }}/>
                </div>
              </div>

              {/* Emotion tags */}
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Logged Emotions</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s1.5)' }}>
                  {trade.emotionTags && trade.emotionTags.length > 0 ? (
                    trade.emotionTags.map(tag => (
                      <span key={tag} className="badge badge-accent" style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: 4 }}>
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem' }}>No emotional states logged.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Tag List */}
            {trade.tags && trade.tags.length > 0 && (
              <div className="glass" style={{ padding: 'var(--s4)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s1.5)' }}>
                  {trade.tags.map(tag => (
                    <span key={tag} style={{
                      fontSize: '0.65rem', background: 'rgba(255,255,255,0.02)',
                      color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: 3,
                      border: '1px solid var(--border)'
                    }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox / Zoom View */}
      {zoomImage && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5,6,8,0.95)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 10000, padding: 'var(--s8)'
        }} onClick={() => setZoomImage(null)}>
          <button style={{
            position: 'absolute', top: 20, right: 20, background: 'var(--surface-glass)',
            border: 'none', color: '#fff', width: 40, height: 40, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }} onClick={() => setZoomImage(null)}>
            <X size={20}/>
          </button>
          <img
            src={zoomImage}
            alt="Zoomed chart screenshot"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 'var(--r-lg)' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default SharedTrade;
