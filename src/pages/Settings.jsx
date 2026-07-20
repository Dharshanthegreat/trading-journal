import React, { useState, useEffect } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { auth as authApi } from '../services/api';
import { parseMT5CSV } from '../utils/mt5Parser';
import {
  Upload, CheckCircle, AlertTriangle, Loader,
  Settings as SettingsIcon, User, Database,
  DollarSign, Shield, Palette, Moon, SunDim,
  Paintbrush, Eye, EyeOff, ExternalLink, Share2, Sparkles, AlertCircle
} from 'lucide-react';

const Settings = () => {
  const { importTrades, loading } = useTrades();
  const { user, updateProfile, refreshUser } = useAuth();
  const { theme, setTheme, cursorEffect, setCursorEffect, bgEffect, setBgEffect, fontStyle, setFontStyle } = useTheme();
  
  const [importStatus, setImportStatus] = useState(null);
  const [importMessage, setImportMessage] = useState('');
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
    accountSize: user?.accountSize || '',
    currency: user?.currency || 'USD',
    riskPercent: user?.riskPercent || '1',
  });
  const [profileSaved, setProfileSaved] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const handleChangePassword = async () => {
    if (user?.isGuest) { alert("Cannot change password in Showcase view."); return; }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(false);
    try {
      await authApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err) {
      setPasswordError(err.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const [sharingLoading, setSharingLoading] = useState(false);
  const [shareToken, setShareToken] = useState(user?.dashboardShareToken || null);
  const [copied, setCopied] = useState(false);

  const [geminiKeyInput, setGeminiKeyInput] = useState(localStorage.getItem('gemini_api_key') || '');
  const [nvidiaKeyInput, setNvidiaKeyInput] = useState(localStorage.getItem('nvidia_api_key') || '');
  const [keysSaved, setKeysSaved] = useState(false);

  const handleSaveApiKeys = () => {
    localStorage.setItem('gemini_api_key', geminiKeyInput.trim());
    localStorage.setItem('nvidia_api_key', nvidiaKeyInput.trim());
    setKeysSaved(true);
    setTimeout(() => setKeysSaved(false), 2000);
  };

  useEffect(() => {
    if (user) {
      setProfileForm({
        displayName: user.displayName || '',
        accountSize: user.accountSize || '',
        currency: user.currency || 'USD',
        riskPercent: user.riskPercent || '1',
      });
      setShareToken(user.dashboardShareToken || null);
    }
  }, [user]);

  const handleGenerateShowcase = async () => {
    setSharingLoading(true);
    try {
      const res = await authApi.generateShowcase();
      setShareToken(res.dashboardShareToken);
      await refreshUser();
    } catch (err) {
      alert(`Failed to generate showcase: ${err.message}`);
    } finally {
      setSharingLoading(false);
    }
  };

  const handleRevokeShowcase = async () => {
    if (!window.confirm("Are you sure you want to revoke your showcase link? Anyone visiting will lose access immediately.")) return;
    setSharingLoading(true);
    try {
      await authApi.revokeShowcase();
      setShareToken(null);
      await refreshUser();
    } catch (err) {
      alert(`Failed to revoke showcase: ${err.message}`);
    } finally {
      setSharingLoading(false);
    }
  };

  const handleCopyShowcaseLink = () => {
    const link = `${window.location.origin}${window.location.pathname}#/shared/dashboard/${shareToken}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = async (e) => {
    if (user?.isGuest) { alert("Cannot import MT5 trades in Showcase view."); return; }
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
    if (user?.isGuest) { alert("Cannot import MT5 trades in Showcase view."); return; }
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload({ target: { files: [file] } });
  };

  const handleSaveProfile = async () => {
    if (user?.isGuest) { alert("Cannot update preferences in Showcase view."); return; }
    try {
      await updateProfile(profileForm);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      console.error('Save profile failed:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', maxWidth: 900, paddingBottom: '60px' }}>
      <div className="page-header">
        <div className="page-title"><SettingsIcon size={18} style={{ opacity: 0.6 }}/> Settings</div>
        <div className="page-subtitle">Configure your journal and manage your account</div>
      </div>

      {/* Account */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '32px', alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={14} style={{ color: 'var(--text-muted)' }}/> Account Profile
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Update your display name and associated email address.
          </p>
        </div>
        <div className="glass settings-section" style={{ padding: 'var(--s6)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
            <div className="form-field">
              <label className="form-label">Display Name</label>
              <input className="input" value={profileForm.displayName} onChange={e => setProfileForm({ ...profileForm, displayName: e.target.value })} disabled={user?.isGuest}/>
            </div>
            <div className="form-field">
              <label className="form-label">Email</label>
              <div className="input" style={{ cursor: 'default', color: 'var(--text-tertiary)' }}>{user?.email || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      {!user?.isGuest && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '32px', alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} style={{ color: 'var(--text-muted)' }}/> Change Password
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Ensure your account is using a long, random password to stay secure.
            </p>
          </div>
          <div className="glass settings-section" style={{ padding: 'var(--s6)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--s4)' }}>
              <div className="form-field">
                <label className="form-label">Current Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    className="input"
                    type={showPasswords ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    style={{ width: '100%', paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    style={{
                      position: 'absolute', right: '10px', background: 'none', border: 'none', padding: 0,
                      cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', outline: 'none'
                    }}
                  >
                    {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
                <div className="form-field">
                  <label className="form-label">New Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      className="input"
                      type={showPasswords ? "text" : "password"}
                      placeholder="Min 6 characters"
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      style={{ width: '100%', paddingRight: '2.5rem' }}
                    />
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-label">Confirm New Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      className="input"
                      type={showPasswords ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={passwordForm.confirmNewPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })}
                      style={{ width: '100%', paddingRight: '2.5rem' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {passwordError && (
              <div style={{ marginTop: 'var(--s3)', padding: 'var(--s2) var(--s3)', borderRadius: 'var(--r-sm)', background: 'var(--loss-soft)', border: '1px solid var(--loss-border)', fontSize: '0.72rem', color: 'var(--loss)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={14} />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div style={{ marginTop: 'var(--s3)', padding: 'var(--s2) var(--s3)', borderRadius: 'var(--r-sm)', background: 'var(--profit-soft)', border: '1px solid var(--profit-border)', fontSize: '0.72rem', color: 'var(--profit)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={14} />
                <span>Password updated successfully!</span>
              </div>
            )}

            <div style={{ marginTop: 'var(--s4)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={handleChangePassword}
                disabled={passwordLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword}
              >
                {passwordLoading ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trading Preferences */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '32px', alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={14} style={{ color: 'var(--text-muted)' }}/> Trading Preferences
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Set your base currency, default risk percentage per trade, and total account size for analytics.
          </p>
        </div>
        <div className="glass settings-section" style={{ padding: 'var(--s6)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--s4)' }}>
            <div className="form-field">
              <label className="form-label">Currency</label>
              <select className="input" value={profileForm.currency} onChange={e => setProfileForm({ ...profileForm, currency: e.target.value })} disabled={user?.isGuest}>
                {['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Default Risk %</label>
              <input className="input" type="number" step="0.1" min="0.1" max="10" value={profileForm.riskPercent} onChange={e => setProfileForm({ ...profileForm, riskPercent: e.target.value })} disabled={user?.isGuest}/>
            </div>
            <div className="form-field">
              <label className="form-label">Account Size ($)</label>
              <input className="input" type="number" step="100" placeholder="10000" value={profileForm.accountSize} onChange={e => setProfileForm({ ...profileForm, accountSize: e.target.value })} disabled={user?.isGuest}/>
            </div>
          </div>
          <div style={{ marginTop: 'var(--s4)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSaveProfile} disabled={user?.isGuest}>
              {profileSaved ? 'Saved ✓' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>

      {/* Showcase Sharing Card */}
      {!user?.isGuest && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '32px', alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Share2 size={14} style={{ color: 'var(--text-muted)' }}/> Showcase Sharing
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Generate a secure, read-only showcase link to share your complete trading journal with your friends. Visitors can view your dashboard, analytics, journal entries, and query the AI coach, but cannot modify your data.
            </p>
          </div>
          <div className="glass settings-section" style={{ padding: 'var(--s6)' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 'var(--s2)' }}>
              {shareToken && (
                <span className="badge badge-success" style={{
                  fontSize: '0.62rem', padding: '2px 8px', background: 'var(--profit-soft)', border: '1px solid var(--profit-border)', color: 'var(--profit)', borderRadius: 'var(--r-md)', fontWeight: 600
                }}>
                  Active
                </span>
              )}
            </div>

          {shareToken ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-md)', padding: 'var(--s2) var(--s3)', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {`${window.location.origin}${window.location.pathname}#/shared/dashboard/${shareToken}`}
                </span>
                <button className="btn btn-secondary" onClick={handleCopyShowcaseLink} style={{ padding: '4px 12px', fontSize: '0.72rem', height: 'auto', flexShrink: 0 }}>
                  {copied ? 'Copied! ✓' : 'Copy Link'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  className="btn btn-danger"
                  onClick={handleRevokeShowcase}
                  disabled={sharingLoading}
                  style={{ padding: '6px 14px', fontSize: '0.75rem', background: 'var(--loss-soft)', border: '1px solid var(--loss-border)', color: 'var(--loss)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}
                >
                  {sharingLoading ? 'Revoking...' : 'Revoke Showcase Link'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleGenerateShowcase} disabled={sharingLoading}>
                {sharingLoading ? 'Generating...' : 'Generate Showcase Link'}
              </button>
            </div>
          )}
          </div>
        </div>
      )}

      {/* AI Configuration */}
      {!user?.isGuest && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '32px', alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} style={{ color: 'var(--text-muted)' }}/> AI Configuration
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Power your journal with state-of-the-art models. Add your Google Gemini API Key to enable instant, highly accurate trade metric extraction from chart screenshots. Add your Nvidia API Key to power the interactive AI Trading Coach.
            </p>
          </div>
          <div className="glass settings-section" style={{ padding: 'var(--s6)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
              <div className="form-field">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Google Gemini API Key</span>
                  <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
                    Get free key <ExternalLink size={10} />
                  </a>
                </label>
                <input className="input" type="password" placeholder="AIzaSy..." value={geminiKeyInput} onChange={e => setGeminiKeyInput(e.target.value)} />
              </div>
              <div className="form-field">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>NVIDIA API Key</span>
                  <a href="https://build.nvidia.com/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
                    Get key <ExternalLink size={10} />
                  </a>
                </label>
                <input className="input" type="password" placeholder="nvapi-..." value={nvidiaKeyInput} onChange={e => setNvidiaKeyInput(e.target.value)} />
              </div>
            </div>
            <div style={{ marginTop: 'var(--s4)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleSaveApiKeys}>
                {keysSaved ? 'Saved ✓' : 'Save AI Keys'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appearance & Themes */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '32px', alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Palette size={14} style={{ color: 'var(--text-muted)' }}/> Appearance & Theme
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Customize your trading workspace with one of our premium, high-contrast flat themes. Set the font and layout grid styling to match your preferred environment.
          </p>
        </div>
        <div className="glass settings-section" style={{ padding: 'var(--s6)' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 'var(--s3)', marginBottom: 'var(--s5)' }}>
            {[
              { id: 'dark', name: 'Dark Slate', desc: 'Obsidian & Indigo', icon: <Moon size={14} />, bg: '#0a0b0f', accent: '#818cf8' },
              { id: 'minimal', name: 'Minimalist', desc: 'Black & White', icon: <Palette size={14} />, bg: '#ffffff', accent: '#000000' },
              { id: 'claymorphism', name: 'Claymorphism', desc: 'Soft Clay UI', icon: <Paintbrush size={14} />, bg: '#edf2f7', accent: '#6366f1' },
              { id: 'emerald-dark', name: 'Emerald Dark', desc: 'Charcoal & Emerald', icon: <Moon size={14} />, bg: '#0c0d10', accent: '#10B981' },
              { id: 'chill-white', name: 'Chill White', desc: 'Soft White & Pink', icon: <SunDim size={14} />, bg: '#FFF9FA', accent: '#FD1843' },
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
                onMouseEnter={e => { if (theme !== t.id) e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
                onMouseLeave={e => { if (theme !== t.id) e.currentTarget.style.borderColor = 'var(--border-mid)'; }}
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

          {/* Workspace Typography / Font style selection */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--s4)', marginBottom: 'var(--s5)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Workspace Typography</h4>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Choose the typeface style for your entire journal interface.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--s4)', marginTop: '8px' }}>
              {[
                { id: 'sans', name: 'Default', font: 'var(--font-sans)' },
                { id: 'serif', name: 'Serif', font: 'var(--font-serif)' },
                { id: 'mono', name: 'Mono', font: 'var(--font-mono)' },
                { id: 'display', name: 'Editorial', font: 'var(--font-display)' },
                { id: 'geometric', name: 'Modernist', font: 'var(--font-geometric)' },
                { id: 'techno', name: 'Futuristic', font: 'var(--font-techno)' },
                { id: 'classic', name: 'Classical', font: 'var(--font-classic)' },
                { id: 'rounded', name: 'Rounded', font: 'var(--font-rounded)' },
              ].map(f => (
                <div
                  key={f.id}
                  onClick={() => setFontStyle(f.id)}
                  style={{
                    border: `1.5px solid ${fontStyle === f.id ? 'var(--accent)' : 'var(--border-mid)'}`,
                    borderRadius: 'var(--r-md)',
                    padding: 'var(--s4) var(--s3)',
                    cursor: 'pointer',
                    background: fontStyle === f.id ? 'var(--bg-active)' : 'var(--bg-secondary)',
                    transition: 'all var(--t-mid)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center'
                  }}
                  onMouseEnter={e => { if (fontStyle !== f.id) e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
                  onMouseLeave={e => { if (fontStyle !== f.id) e.currentTarget.style.borderColor = 'var(--border-mid)'; }}
                >
                  <div style={{ fontSize: '2rem', fontWeight: 600, fontFamily: f.font, color: fontStyle === f.id ? 'var(--accent)' : 'var(--text-primary)', lineHeight: 1 }}>
                    Ag
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 500, color: fontStyle === f.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {f.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cursor Settings */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Cursor Splash Effect</h4>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Enable the interactive WebGL fluid cursor trail and click burst animation.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button type="button" className={`btn btn-sm ${cursorEffect ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCursorEffect(true)}>On</button>
                <button type="button" className={`btn btn-sm ${!cursorEffect ? 'btn-danger' : 'btn-ghost'}`} onClick={() => setCursorEffect(false)}>Off</button>
              </div>
            </div>
          </div>

          {/* Aceternity UI Background Effect Settings */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--s4)', marginTop: 'var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Aceternity Background Layout</h4>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Apply premium radial-faded grid or dot patterns behind the workspace.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {[
                  { id: 'none', label: 'None' },
                  { id: 'grid', label: 'Grid Lines' },
                  { id: 'dots', label: 'Dot Pattern' },
                ].map(opt => (
                  <button key={opt.id} type="button" className={`btn btn-sm ${bgEffect === opt.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setBgEffect(opt.id)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MT5 Import */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '32px', alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={14} style={{ color: 'var(--text-muted)' }}/> MT5 Trade Import
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Import your trade history from MetaTrader 5. To export: MT5 → Terminal → History → Right Click → Report → Open as CSV
          </p>
        </div>
        <div className="glass settings-section" style={{ padding: 'var(--s6)' }}>
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
      </div>

    </div>
  );
};

export default Settings;
