import React, { useState } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { parseMT5CSV } from '../utils/mt5Parser';
import {
  Upload, CheckCircle, AlertTriangle, Loader,
  Settings as SettingsIcon, User, Database,
  DollarSign, Shield, Download, Palette, Moon, Sun,
  Compass, Leaf, SunDim
} from 'lucide-react';

const Settings = () => {
  const { importTrades, exportTrades, loading } = useTrades();
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [importStatus, setImportStatus] = useState(null);
  const [importMessage, setImportMessage] = useState('');
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
    accountSize: user?.accountSize || '',
    currency: user?.currency || 'USD',
    riskPercent: user?.riskPercent || '1',
  });
  const [profileSaved, setProfileSaved] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportStatus('loading');
    setImportMessage('Parsing MT5 CSV file...');
    try {
      const parsed = await parseMT5CSV(file);
      if (!parsed.length) { setImportStatus('error'); setImportMessage('No valid trades found.'); return; }
      setImportMessage(`Found ${parsed.length} trades. Importing...`);
      await importTrades(parsed);
      setImportStatus('success');
      setImportMessage(`Successfully imported ${parsed.length} trades.`);
    } catch (err) {
      setImportStatus('error');
      setImportMessage(err.message || 'Failed to parse file.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload({ target: { files: [file] } });
  };

  const handleExport = async () => {
    try {
      const data = await exportTrades();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `trading_journal_export_${Date.now()}.json`;
      a.click(); URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile(profileForm);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      console.error('Save profile failed:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)', maxWidth: 700 }}>
      <div className="page-header">
        <div className="page-title"><SettingsIcon size={18} style={{ opacity: 0.6 }}/> Settings</div>
        <div className="page-subtitle">Configure your journal and manage your account</div>
      </div>

      {/* Account */}
      <div className="glass settings-section" style={{ padding: 'var(--s6)' }}>
        <div className="settings-section-title"><User size={12}/> Account</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
          <div className="form-field">
            <label className="form-label">Display Name</label>
            <input className="input" value={profileForm.displayName} onChange={e => setProfileForm({ ...profileForm, displayName: e.target.value })}/>
          </div>
          <div className="form-field">
            <label className="form-label">Email</label>
            <div className="input" style={{ cursor: 'default', color: 'var(--text-tertiary)' }}>{user?.email || '—'}</div>
          </div>
        </div>
      </div>

      {/* Trading Preferences */}
      <div className="glass settings-section" style={{ padding: 'var(--s6)' }}>
        <div className="settings-section-title"><DollarSign size={12}/> Trading Preferences</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--s4)' }}>
          <div className="form-field">
            <label className="form-label">Currency</label>
            <select className="input" value={profileForm.currency} onChange={e => setProfileForm({ ...profileForm, currency: e.target.value })}>
              {['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Default Risk %</label>
            <input className="input" type="number" step="0.1" min="0.1" max="10" value={profileForm.riskPercent} onChange={e => setProfileForm({ ...profileForm, riskPercent: e.target.value })}/>
          </div>
          <div className="form-field">
            <label className="form-label">Account Size ($)</label>
            <input className="input" type="number" step="100" placeholder="10000" value={profileForm.accountSize} onChange={e => setProfileForm({ ...profileForm, accountSize: e.target.value })}/>
          </div>
        </div>
        <div style={{ marginTop: 'var(--s4)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSaveProfile}>
            {profileSaved ? 'Saved ✓' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* Appearance & Themes */}
      <div className="glass settings-section" style={{ padding: 'var(--s6)' }}>
        <div className="settings-section-title"><Palette size={12}/> Appearance & Theme</div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 'var(--s4)' }}>
          Customize your trading workspace with one of our premium, high-contrast flat themes.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 'var(--s3)' }}>
          {[
            { id: 'dark', name: 'Dark Slate', desc: 'Obsidian & Indigo', icon: <Moon size={14} />, bg: '#0a0b0f', accent: '#818cf8' },
            { id: 'light', name: 'Light White', desc: 'Clean & Bright', icon: <Sun size={14} />, bg: '#f6f8fa', accent: '#4f46e5' },
            { id: 'nord', name: 'Nord Arctic', desc: 'Cool Slate Blue', icon: <Compass size={14} />, bg: '#1a1e2a', accent: '#88c0d0' },
            { id: 'forest', name: 'Forest Pine', desc: 'Deep Emerald', icon: <Leaf size={14} />, bg: '#0b0f0d', accent: '#10b981' },
            { id: 'sunset', name: 'Sunset Amber', desc: 'Warm Charcoal', icon: <SunDim size={14} />, bg: '#120f0e', accent: '#f97316' },
            { id: 'minimal', name: 'Minimalist', desc: 'Black & White', icon: <Palette size={14} />, bg: '#ffffff', accent: '#000000' },
          ].map(t => (
            <div
              key={t.id}
              onClick={() => setTheme(t.id)}
              style={{
                border: `1.5px solid ${theme === t.id ? 'var(--accent)' : 'var(--border-mid)'}`,
                borderRadius: 'var(--r-md)',
                padding: 'var(--s3)',
                cursor: 'pointer',
                background: theme === t.id ? 'var(--bg-active)' : 'var(--bg-secondary)',
                transition: 'all var(--t-mid)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                position: 'relative'
              }}
              onMouseEnter={e => {
                if (theme !== t.id) e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
              onMouseLeave={e => {
                if (theme !== t.id) e.currentTarget.style.borderColor = 'var(--border-mid)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ display: 'flex', alignItems: 'center', color: theme === t.id ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                  {t.icon}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.accent }} />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.bg, border: '1px solid rgba(128,128,128,0.2)' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.name}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MT5 Import */}
      <div className="glass settings-section" style={{ padding: 'var(--s6)' }}>
        <div className="settings-section-title"><Database size={12}/> MT5 Trade Import</div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 'var(--s5)' }}>
          Import your trade history from MetaTrader 5. To export: MT5 → Terminal → History → Right Click → Report → Open as CSV
        </p>
        <label className="upload-zone" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
          <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} disabled={importStatus === 'loading' || loading}/>
          {importStatus === 'loading' ? (
            <Loader size={32} style={{ color: 'var(--accent)', opacity: 0.7, animation: 'spin 1s linear infinite' }}/>
          ) : (
            <Upload size={32} style={{ color: 'var(--accent)', opacity: 0.7 }}/>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
              {importStatus === 'loading' ? 'Processing...' : 'Drop CSV file here or click to browse'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MT5 CSV export only</div>
          </div>
        </label>
        {importStatus && importStatus !== 'loading' && (
          <div style={{
            marginTop: 'var(--s4)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-md)',
            display: 'flex', alignItems: 'center', gap: 'var(--s3)', fontSize: '0.78rem',
            background: importStatus === 'error' ? 'var(--loss-soft)' : 'var(--profit-soft)',
            border: `1px solid ${importStatus === 'error' ? 'var(--loss-border)' : 'var(--profit-border)'}`,
          }}>
            {importStatus === 'success' ? <CheckCircle size={15} style={{ color: 'var(--profit)', flexShrink: 0 }}/> : <AlertTriangle size={15} style={{ color: 'var(--loss)', flexShrink: 0 }}/>}
            <span style={{ color: importStatus === 'error' ? 'var(--loss)' : 'var(--profit)' }}>{importMessage}</span>
          </div>
        )}
      </div>

      {/* Data Management */}
      <div className="glass settings-section" style={{ padding: 'var(--s6)' }}>
        <div className="settings-section-title"><Shield size={12}/> Data Management</div>
        <div style={{ display: 'flex', gap: 'var(--s3)', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={handleExport}>
            <Download size={14}/> Export JSON Backup
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
