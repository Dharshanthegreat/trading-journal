import React, { useState, useEffect } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { auth as authApi } from '../services/api';
import { parseMT5CSV } from '../utils/mt5Parser';
import {
  Upload, CheckCircle, AlertTriangle, Loader,
  Settings as SettingsIcon, User, Database as DatabaseIcon,
  DollarSign, Shield, Palette, Moon, SunDim,
  Paintbrush, Eye, EyeOff, ExternalLink, Share2, Sparkles, AlertCircle,
  Check, Trash2, Copy, Sliders
} from 'lucide-react';

const Settings = () => {
  const { importTrades, loading } = useTrades();
  const { user, updateProfile, refreshUser } = useAuth();
  const { theme, setTheme, cursorEffect, setCursorEffect, bgEffect, setBgEffect, fontStyle, setFontStyle } = useTheme();

  const [activeTab, setActiveTab] = useState('all');

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

  const [showAiKeys, setShowAiKeys] = useState(false);

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

  const isTabVisible = (tabId) => activeTab === 'all' || activeTab === tabId;

  return (
    <div className="settings-v2-container">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 'var(--s4)' }}>
        <div className="page-title">
          <SettingsIcon size={22} style={{ color: 'var(--accent)' }}/>
          Settings & Preferences
        </div>
        <div className="page-subtitle">
          Configure your trading workspace, profile parameters, theme styles, and AI integrations.
        </div>
      </div>

      {/* Navigation Filter Tabs */}
      <div className="settings-nav-tabs">
        {[
          { id: 'all', label: 'All Settings', icon: <Sliders size={14} /> },
          { id: 'account', label: 'Account & Preferences', icon: <User size={14} /> },
          { id: 'appearance', label: 'Appearance & Theme', icon: <Palette size={14} /> },
          { id: 'ai', label: 'AI Configuration', icon: <Sparkles size={14} /> },
          { id: 'showcase', label: 'Sharing & Security', icon: <Share2 size={14} /> },
          { id: 'import', label: 'MT5 Import', icon: <DatabaseIcon size={14} /> },
        ].map(tab => (
          <button
            key={tab.id}
            className={`settings-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Account Profile & Trading Preferences Card */}
      {isTabVisible('account') && (
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title-group">
              <div className="settings-card-icon">
                <User size={20} />
              </div>
              <div>
                <div className="settings-card-title">Account Profile & Trading Preferences</div>
                <div className="settings-card-desc">
                  Manage your display profile, default risk percentage per trade, base currency, and overall account capital size.
                </div>
              </div>
            </div>
            {profileSaved && (
              <span className="settings-badge settings-badge-success">
                <Check size={12} /> Saved
              </span>
            )}
          </div>

          <div className="settings-card-divider" />

          <div className="settings-grid-2">
            <div className="settings-input-group">
              <label className="settings-input-label">Display Name</label>
              <input
                className="input"
                value={profileForm.displayName}
                onChange={e => setProfileForm({ ...profileForm, displayName: e.target.value })}
                disabled={user?.isGuest}
                placeholder="Enter your name"
              />
            </div>
            <div className="settings-input-group">
              <label className="settings-input-label">
                <span>Email Address</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Read-only</span>
              </label>
              <input
                className="input"
                value={user?.email || '—'}
                disabled
                style={{ opacity: 0.7, cursor: 'not-allowed', background: 'var(--bg-tertiary)' }}
              />
            </div>
          </div>

          <div className="settings-grid-3">
            <div className="settings-input-group">
              <label className="settings-input-label">Base Currency</label>
              <select
                className="input"
                value={profileForm.currency}
                onChange={e => setProfileForm({ ...profileForm, currency: e.target.value })}
                disabled={user?.isGuest}
              >
                {['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="settings-input-group">
              <label className="settings-input-label">Default Risk %</label>
              <div className="settings-input-wrapper">
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  value={profileForm.riskPercent}
                  onChange={e => setProfileForm({ ...profileForm, riskPercent: e.target.value })}
                  disabled={user?.isGuest}
                  style={{ paddingRight: '2rem' }}
                />
                <span style={{ position: 'absolute', right: '12px', color: 'var(--text-muted)', fontSize: '0.75rem', pointerEvents: 'none' }}>%</span>
              </div>
            </div>
            <div className="settings-input-group">
              <label className="settings-input-label">Account Size ($)</label>
              <div className="settings-input-wrapper">
                <span style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', fontSize: '0.75rem', pointerEvents: 'none' }}>$</span>
                <input
                  className="input"
                  type="number"
                  step="100"
                  placeholder="10000"
                  value={profileForm.accountSize}
                  onChange={e => setProfileForm({ ...profileForm, accountSize: e.target.value })}
                  disabled={user?.isGuest}
                  style={{ paddingLeft: '1.8rem' }}
                />
              </div>
            </div>
          </div>

          <div className="settings-card-actions">
            <button
              className="btn btn-primary"
              onClick={handleSaveProfile}
              disabled={user?.isGuest}
            >
              {profileSaved ? (
                <>
                  <Check size={15} /> Saved Preferences
                </>
              ) : (
                'Save Preferences'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Appearance & Theme Card */}
      {isTabVisible('appearance') && (
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title-group">
              <div className="settings-card-icon">
                <Palette size={20} />
              </div>
              <div>
                <div className="settings-card-title">Appearance & Workspace Theme</div>
                <div className="settings-card-desc">
                  Tailor your workspace aesthetics with custom color palettes, modern typography, fluid WebGL cursor effects, and grid backgrounds.
                </div>
              </div>
            </div>
          </div>

          <div className="settings-card-divider" />

          {/* Color Themes */}
          <div>
            <div className="settings-input-label" style={{ marginBottom: 'var(--s3)' }}>
              <span>Theme Palette</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Click to apply instantly</span>
            </div>
            <div className="theme-card-grid">
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
                  className={`theme-card-option ${theme === t.id ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ color: theme === t.id ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                      {t.icon}
                    </span>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.accent }} />
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.bg, border: '1px solid rgba(128,128,128,0.2)' }} />
                      {theme === t.id && <Check size={12} style={{ color: 'var(--accent)', marginLeft: 2 }} />}
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

          {/* Typography */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--s4)' }}>
            <div className="settings-input-label" style={{ marginBottom: 'var(--s3)' }}>
              <span>Workspace Typography</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Typeface style</span>
            </div>
            <div className="font-card-grid">
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
                  className={`font-card-option ${fontStyle === f.id ? 'active' : ''}`}
                >
                  <div style={{ fontSize: '1.8rem', fontWeight: 600, fontFamily: f.font, color: fontStyle === f.id ? 'var(--accent)' : 'var(--text-primary)', lineHeight: 1 }}>
                    Ag
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 500, color: fontStyle === f.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {f.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Effects Controls */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--s4)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s5)' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Cursor Splash Effect</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 'var(--s3)' }}>Interactive WebGL fluid cursor trail animation.</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${cursorEffect ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setCursorEffect(true)}
                  style={{ minWidth: '60px' }}
                >
                  On
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${!cursorEffect ? 'btn-ghost' : 'btn-ghost'}`}
                  onClick={() => setCursorEffect(false)}
                  style={{ minWidth: '60px', opacity: !cursorEffect ? 1 : 0.6 }}
                >
                  Off
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Background Layout Grid</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 'var(--s3)' }}>Radial faded grid line or dot patterns.</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: 'none', label: 'None' },
                  { id: 'grid', label: 'Grid Lines' },
                  { id: 'dots', label: 'Dot Pattern' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`btn btn-sm ${bgEffect === opt.id ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setBgEffect(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Configuration Card */}
      {isTabVisible('ai') && !user?.isGuest && (
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title-group">
              <div className="settings-card-icon">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="settings-card-title">AI Engine Configuration</div>
                <div className="settings-card-desc">
                  Connect your Google Gemini API Key for automatic chart metric parsing and your NVIDIA API Key for interactive AI Trading Coach guidance.
                </div>
              </div>
            </div>
            {keysSaved && (
              <span className="settings-badge settings-badge-success">
                <Check size={12} /> API Keys Saved
              </span>
            )}
          </div>

          <div className="settings-card-divider" />

          <div className="settings-grid-2">
            <div className="settings-input-group">
              <div className="settings-input-label">
                <span>Google Gemini API Key</span>
                <a
                  href="https://aistudio.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.68rem', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                >
                  Get free key <ExternalLink size={10} />
                </a>
              </div>
              <div className="settings-input-wrapper">
                <input
                  className="input"
                  type={showAiKeys ? "text" : "password"}
                  placeholder="AIzaSy..."
                  value={geminiKeyInput}
                  onChange={e => setGeminiKeyInput(e.target.value)}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowAiKeys(!showAiKeys)}
                  style={{
                    position: 'absolute', right: '10px', background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center'
                  }}
                >
                  {showAiKeys ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="settings-input-group">
              <div className="settings-input-label">
                <span>NVIDIA API Key</span>
                <a
                  href="https://build.nvidia.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.68rem', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                >
                  Get key <ExternalLink size={10} />
                </a>
              </div>
              <div className="settings-input-wrapper">
                <input
                  className="input"
                  type={showAiKeys ? "text" : "password"}
                  placeholder="nvapi-..."
                  value={nvidiaKeyInput}
                  onChange={e => setNvidiaKeyInput(e.target.value)}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowAiKeys(!showAiKeys)}
                  style={{
                    position: 'absolute', right: '10px', background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center'
                  }}
                >
                  {showAiKeys ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          <div className="settings-card-actions">
            <button className="btn btn-primary" onClick={handleSaveApiKeys}>
              {keysSaved ? (
                <>
                  <Check size={15} /> Saved API Keys
                </>
              ) : (
                'Save AI Keys'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Showcase Sharing Card */}
      {isTabVisible('showcase') && !user?.isGuest && (
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title-group">
              <div className="settings-card-icon">
                <Share2 size={20} />
              </div>
              <div>
                <div className="settings-card-title">Showcase Sharing</div>
                <div className="settings-card-desc">
                  Generate a secure, read-only link to share your journal, performance metrics, and AI Coach insights with mentors or friends.
                </div>
              </div>
            </div>
            {shareToken ? (
              <span className="settings-badge settings-badge-success">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--profit)', display: 'inline-block' }} /> Active Showcase
              </span>
            ) : (
              <span className="settings-badge settings-badge-muted">Disabled</span>
            )}
          </div>

          <div className="settings-card-divider" />

          {shareToken ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
              <div className="settings-input-group">
                <label className="settings-input-label">Public Showcase URL</label>
                <div style={{ display: 'flex', gap: 'var(--s2)', width: '100%' }}>
                  <input
                    className="input"
                    readOnly
                    value={`${window.location.origin}${window.location.pathname}#/shared/dashboard/${shareToken}`}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', flex: 1, background: 'var(--bg-tertiary)' }}
                  />
                  <button className="btn btn-secondary" onClick={handleCopyShowcaseLink} style={{ flexShrink: 0, gap: 6 }}>
                    {copied ? <Check size={14} style={{ color: 'var(--profit)' }} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn-danger-subtle"
                  onClick={handleRevokeShowcase}
                  disabled={sharingLoading}
                >
                  <Trash2 size={14} />
                  {sharingLoading ? 'Revoking...' : 'Revoke Showcase Link'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--s4)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                No active showcase link. Click below to create a shareable read-only snapshot.
              </div>
              <button className="btn btn-primary" onClick={handleGenerateShowcase} disabled={sharingLoading}>
                {sharingLoading ? 'Generating...' : 'Generate Showcase Link'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Security & Change Password Card */}
      {isTabVisible('showcase') && !user?.isGuest && (
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title-group">
              <div className="settings-card-icon">
                <Shield size={20} />
              </div>
              <div>
                <div className="settings-card-title">Security & Change Password</div>
                <div className="settings-card-desc">
                  Keep your account secure by setting a strong, random password.
                </div>
              </div>
            </div>
          </div>

          <div className="settings-card-divider" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
            <div className="settings-input-group">
              <label className="settings-input-label">Current Password</label>
              <div className="settings-input-wrapper">
                <input
                  className="input"
                  type={showPasswords ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  style={{
                    position: 'absolute', right: '10px', background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center'
                  }}
                >
                  {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="settings-grid-2">
              <div className="settings-input-group">
                <label className="settings-input-label">New Password</label>
                <div className="settings-input-wrapper">
                  <input
                    className="input"
                    type={showPasswords ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    style={{ paddingRight: '2.5rem' }}
                  />
                </div>
              </div>

              <div className="settings-input-group">
                <label className="settings-input-label">Confirm New Password</label>
                <div className="settings-input-wrapper">
                  <input
                    className="input"
                    type={showPasswords ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={passwordForm.confirmNewPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })}
                    style={{ paddingRight: '2.5rem' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {passwordError && (
            <div style={{ padding: 'var(--s3)', borderRadius: 'var(--r-md)', background: 'var(--loss-soft)', border: '1px solid var(--loss-border)', fontSize: '0.75rem', color: 'var(--loss)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={15} />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div style={{ padding: 'var(--s3)', borderRadius: 'var(--r-md)', background: 'var(--profit-soft)', border: '1px solid var(--profit-border)', fontSize: '0.75rem', color: 'var(--profit)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={15} />
              <span>Password updated successfully!</span>
            </div>
          )}

          <div className="settings-card-actions">
            <button
              className="btn btn-primary"
              onClick={handleChangePassword}
              disabled={passwordLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword}
            >
              {passwordLoading ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </div>
      )}

      {/* MetaTrader 5 Import Card */}
      {isTabVisible('import') && (
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title-group">
              <div className="settings-card-icon">
                <DatabaseIcon size={20} />
              </div>
              <div>
                <div className="settings-card-title">MT5 Trade Import</div>
                <div className="settings-card-desc">
                  Import trade history exported from MetaTrader 5 (MT5 → Terminal → History → Right Click → Report → Open as CSV).
                </div>
              </div>
            </div>
          </div>

          <div className="settings-card-divider" />

          <label className="upload-zone" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
            <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              disabled={importStatus === 'loading' || loading}
            />
            {importStatus === 'loading' ? (
              <Loader size={36} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }}/>
            ) : (
              <Upload size={36} style={{ color: 'var(--accent)', opacity: 0.8 }}/>
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                {importStatus === 'loading' ? 'Processing CSV File...' : 'Drop MT5 CSV file here or click to browse'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Supports standard MetaTrader 5 exported CSV trade reports
              </div>
            </div>
          </label>

          {importStatus && importStatus !== 'loading' && (
            <div style={{
              padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-md)',
              display: 'flex', alignItems: 'center', gap: 'var(--s3)', fontSize: '0.78rem',
              background: importStatus === 'error' ? 'var(--loss-soft)' : 'var(--profit-soft)',
              border: `1px solid ${importStatus === 'error' ? 'var(--loss-border)' : 'var(--profit-border)'}`,
            }}>
              {importStatus === 'success' ? (
                <CheckCircle size={16} style={{ color: 'var(--profit)', flexShrink: 0 }}/>
              ) : (
                <AlertTriangle size={16} style={{ color: 'var(--loss)', flexShrink: 0 }}/>
              )}
              <span style={{ color: importStatus === 'error' ? 'var(--loss)' : 'var(--profit)', fontWeight: 500 }}>
                {importMessage}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Settings;
