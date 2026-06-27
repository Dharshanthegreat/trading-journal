import React, { useState, useEffect } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useJournal } from '../contexts/JournalContext';
import { backup as backupApi, auth as authApi } from '../services/api';
import { parseMT5CSV } from '../utils/mt5Parser';
import {
  Upload, CheckCircle, AlertTriangle, Loader,
  Settings as SettingsIcon, User, Database,
  DollarSign, Shield, Download, Palette, Moon, Sun,
  Compass, Leaf, SunDim, Clock, RefreshCw, Trash2,
  History, AlertCircle, FileJson, Check, Share2,
  Zap, Sparkles, Paintbrush, Layers, Grid, Droplet, Square, Trophy,
  Eye, EyeOff, ExternalLink
} from 'lucide-react';

const Settings = () => {
  const { importTrades, exportTrades, loading, fetchTrades, fetchAnalytics } = useTrades();
  const { user, updateProfile, refreshUser } = useAuth();
  const { theme, setTheme, cursorEffect, setCursorEffect, bgEffect, setBgEffect, fontStyle, setFontStyle } = useTheme();
  const { fetchEntries } = useJournal();
  
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
    const link = `${window.location.origin}/shared/dashboard/${shareToken}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Backup & Restore states
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [backupFile, setBackupFile] = useState(null);
  const [backupError, setBackupError] = useState(null);
  const [importMode, setImportMode] = useState('merge'); // 'merge' or 'overwrite'
  const [overwriteConfirmText, setOverwriteConfirmText] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  // Load audit logs on mount
  useEffect(() => {
    try {
      const logs = localStorage.getItem('trading_journal_backup_logs');
      if (logs) setAuditLogs(JSON.parse(logs));
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  }, []);

  const getAuditLogs = () => {
    try {
      const logs = localStorage.getItem('trading_journal_backup_logs');
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  };

  const addAuditLog = (action, itemsText, status, fileSize = '') => {
    try {
      const logs = getAuditLogs();
      const newLog = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        action,
        itemsText,
        status,
        fileSize
      };
      const updatedLogs = [newLog, ...logs].slice(0, 10);
      localStorage.setItem('trading_journal_backup_logs', JSON.stringify(updatedLogs));
      setAuditLogs(updatedLogs);
    } catch (err) {
      console.error('Failed to save audit log:', err);
    }
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

  const handleExport = async () => {
    if (user?.isGuest) { alert("Cannot export trades in Showcase view."); return; }
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

  const handleFullExport = async () => {
    if (user?.isGuest) { alert("Cannot export database in Showcase view."); return; }
    setExporting(true);
    try {
      const data = await backupApi.export();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trading_journal_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      const itemsCount = `${data.trades?.length || 0} trades, ${data.journalEntries?.length || 0} journals`;
      const sizeKb = (jsonStr.length / 1024).toFixed(1) + ' KB';
      addAuditLog('Full Export', itemsCount, 'success', sizeKb);
    } catch (err) {
      console.error('Export failed:', err);
      addAuditLog('Full Export', 'Export Failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleBackupFileSelect = (file) => {
    if (user?.isGuest) { alert("Cannot restore database in Showcase view."); return; }
    if (!file) return;
    setBackupError(null);
    setBackupFile(null);
    
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setBackupError('Invalid file type. Please upload a JSON backup file.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.trades || !parsed.journalEntries) {
          setBackupError('Invalid backup schema. Missing trades or journalEntries list.');
          return;
        }
        
        setBackupFile({
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          tradesCount: parsed.trades.length,
          journalEntriesCount: parsed.journalEntries.length,
          user: parsed.user || null,
          rawData: parsed
        });
      } catch (err) {
        setBackupError('Failed to parse file. Ensure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleBackupDrop = (e) => {
    if (user?.isGuest) { alert("Cannot restore database in Showcase view."); return; }
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleBackupFileSelect(file);
  };

  const handleConfirmRestore = async () => {
    if (user?.isGuest) { alert("Cannot restore database in Showcase view."); return; }
    if (!backupFile) return;
    
    if (importMode === 'overwrite' && overwriteConfirmText !== 'RESTORE') {
      return;
    }
    
    setImporting(true);
    try {
      const payload = {
        ...backupFile.rawData,
        mode: importMode
      };
      
      const result = await backupApi.import(payload);
      
      const itemsCount = `${result.tradesImported} trades, ${result.journalsImported} journals`;
      addAuditLog(`Restore (${importMode})`, itemsCount, 'success', backupFile.size);
      
      setImportSuccess(true);
      setBackupFile(null);
      setOverwriteConfirmText('');
      
      // Refresh context data
      await refreshUser();
      await fetchTrades({ limit: 200 });
      await fetchAnalytics();
      await fetchEntries();
      
      setTimeout(() => {
        setImportSuccess(false);
      }, 4000);
      
    } catch (err) {
      console.error('Import failed:', err);
      setBackupError(err.message || 'Import failed. Check server connection.');
      addAuditLog(`Restore (${importMode})`, 'Import Failed', 'error', backupFile.size);
    } finally {
      setImporting(false);
    }
  };

  const clearBackupFile = () => {
    setBackupFile(null);
    setBackupError(null);
    setOverwriteConfirmText('');
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
            <input className="input" value={profileForm.displayName} onChange={e => setProfileForm({ ...profileForm, displayName: e.target.value })} disabled={user?.isGuest}/>
          </div>
          <div className="form-field">
            <label className="form-label">Email</label>
            <div className="input" style={{ cursor: 'default', color: 'var(--text-tertiary)' }}>{user?.email || '—'}</div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      {!user?.isGuest && (
        <div className="glass settings-section" style={{ padding: 'var(--s6)' }}>
          <div className="settings-section-title"><Shield size={12}/> Change Password</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--s4)' }}>
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
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    outline: 'none'
                  }}
                >
                  {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            
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
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    outline: 'none'
                  }}
                >
                  {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
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
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    outline: 'none'
                  }}
                >
                  {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {passwordError && (
            <div style={{
              marginTop: 'var(--s3)',
              padding: 'var(--s2) var(--s3)',
              borderRadius: 'var(--r-sm)',
              background: 'var(--loss-soft)',
              border: '1px solid var(--loss-border)',
              fontSize: '0.72rem',
              color: 'var(--loss)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={14} />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div style={{
              marginTop: 'var(--s3)',
              padding: 'var(--s2) var(--s3)',
              borderRadius: 'var(--r-sm)',
              background: 'var(--profit-soft)',
              border: '1px solid var(--profit-border)',
              fontSize: '0.72rem',
              color: 'var(--profit)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
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
      )}

      {/* Trading Preferences */}
      <div className="glass settings-section" style={{ padding: 'var(--s6)' }}>
        <div className="settings-section-title"><DollarSign size={12}/> Trading Preferences</div>
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


      {/* Showcase Sharing Card */}
      {!user?.isGuest && (
        <div className="glass settings-section" style={{ padding: 'var(--s6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s2)' }}>
            <div className="settings-section-title" style={{ margin: 0, borderBottom: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Share2 size={14} style={{ opacity: 0.6 }}/> Showcase Sharing
            </div>
            {shareToken && (
              <span className="badge badge-success" style={{
                fontSize: '0.62rem',
                padding: '2px 8px',
                background: 'var(--profit-soft)',
                border: '1px solid var(--profit-border)',
                color: 'var(--profit)',
                borderRadius: 'var(--r-md)',
                fontWeight: 600
              }}>
                Active
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 'var(--s4)', lineHeight: 1.6 }}>
            Generate a secure, read-only showcase link to share your complete trading journal with your friends. Visitors can view your dashboard, analytics, journal entries, and query the AI coach, but cannot modify your data.
          </p>

          {shareToken ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              <div style={{
                display: 'flex',
                gap: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-mid)',
                borderRadius: 'var(--r-md)',
                padding: 'var(--s2) var(--s3)',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1
                }}>
                  {`${window.location.origin}/shared/dashboard/${shareToken}`}
                </span>
                <button
                  className="btn btn-secondary"
                  onClick={handleCopyShowcaseLink}
                  style={{ padding: '4px 12px', fontSize: '0.72rem', height: 'auto', flexShrink: 0 }}
                >
                  {copied ? 'Copied! ✓' : 'Copy Link'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  className="btn btn-danger"
                  onClick={handleRevokeShowcase}
                  disabled={sharingLoading}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.75rem',
                    background: 'var(--loss-soft)',
                    border: '1px solid var(--loss-border)',
                    color: 'var(--loss)',
                    borderRadius: 'var(--r-md)',
                    cursor: 'pointer'
                  }}
                >
                  {sharingLoading ? 'Revoking...' : 'Revoke Showcase Link'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={handleGenerateShowcase}
                disabled={sharingLoading}
              >
                {sharingLoading ? 'Generating...' : 'Generate Showcase Link'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* AI Configuration */}
      {!user?.isGuest && (
        <div className="glass settings-section" style={{ padding: 'var(--s6)' }}>
          <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={12} style={{ opacity: 0.6 }}/> AI Configuration
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 'var(--s4)', lineHeight: 1.6 }}>
            Power your journal with state-of-the-art models. Add your Google Gemini API Key to enable instant, highly accurate trade metric extraction from chart screenshots. Add your Nvidia API Key to power the interactive AI Trading Coach.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
            <div className="form-field">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Google Gemini API Key</span>
                <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
                  Get free key <ExternalLink size={10} />
                </a>
              </label>
              <input
                className="input"
                type="password"
                placeholder="AIzaSy..."
                value={geminiKeyInput}
                onChange={e => setGeminiKeyInput(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>NVIDIA API Key</span>
                <a href="https://build.nvidia.com/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
                  Get key <ExternalLink size={10} />
                </a>
              </label>
              <input
                className="input"
                type="password"
                placeholder="nvapi-..."
                value={nvidiaKeyInput}
                onChange={e => setNvidiaKeyInput(e.target.value)}
              />
            </div>
          </div>
          <div style={{ marginTop: 'var(--s4)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSaveApiKeys}>
              {keysSaved ? 'Saved ✓' : 'Save AI Keys'}
            </button>
          </div>
        </div>
      )}

      {/* Appearance & Themes */}
      <div className="glass settings-section" style={{ padding: 'var(--s6)' }}>
        <div className="settings-section-title"><Palette size={12}/> Appearance & Theme</div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 'var(--s4)' }}>
          Customize your trading workspace with one of our premium, high-contrast flat themes.
        </p>
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
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  textAlign: 'center'
                }}
                onMouseEnter={e => {
                  if (fontStyle !== f.id) e.currentTarget.style.borderColor = 'var(--border-strong)';
                }}
                onMouseLeave={e => {
                  if (fontStyle !== f.id) e.currentTarget.style.borderColor = 'var(--border-mid)';
                }}
              >
                <div style={{ 
                  fontSize: '2rem', 
                  fontWeight: 600, 
                  fontFamily: f.font,
                  color: fontStyle === f.id ? 'var(--accent)' : 'var(--text-primary)',
                  lineHeight: 1
                }}>
                  Ag
                </div>
                <div style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 500, 
                  color: fontStyle === f.id ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}>
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
              <button 
                type="button" 
                className={`btn btn-sm ${cursorEffect ? 'btn-primary' : 'btn-ghost'}`} 
                onClick={() => setCursorEffect(true)}
              >
                On
              </button>
              <button 
                type="button" 
                className={`btn btn-sm ${!cursorEffect ? 'btn-danger' : 'btn-ghost'}`} 
                onClick={() => setCursorEffect(false)}
              >
                Off
              </button>
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

      {/* GitHub UI/UX Pro Max Data Control Center */}
      <div className="glass settings-section" style={{ padding: 'var(--s6)', position: 'relative', overflow: 'hidden' }}>
        
        {/* Pro Max Animated Gradient Header Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)' }}>
          <div className="settings-section-title" style={{ margin: 0, borderBottom: 'none', padding: 0 }}>
            <Database size={12} style={{ marginRight: 6 }}/> Data Control Center
          </div>
          <span className="badge" style={{
            background: 'linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6)',
            color: '#ffffff',
            border: 'none',
            fontSize: '0.62rem',
            padding: '2px 8px',
            boxShadow: '0 0 10px rgba(236, 72, 153, 0.4)',
            animation: 'pulse-glow 2s infinite',
            fontWeight: 800,
            letterSpacing: '0.05em'
          }}>
            PRO MAX
          </span>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 'var(--s5)', lineHeight: 1.6 }}>
          Manage your journal backups. Export all trades, settings, and journal notes, or restore your database at any time.
        </p>

        {/* Top Success Banner */}
        {importSuccess && (
          <div className="anim-fade-in" style={{
            marginBottom: 'var(--s4)',
            padding: 'var(--s3) var(--s4)',
            borderRadius: 'var(--r-md)',
            background: 'var(--profit-soft)',
            border: '1px solid var(--profit-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--s3)',
            fontSize: '0.78rem',
            color: 'var(--profit)'
          }}>
            <CheckCircle size={16} />
            <div>
              <strong>Restore Successful!</strong> All trades, entries, and settings profiles have been synced.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
          
          {/* Card: Export Database */}
          <div className="glass-deep" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-mid)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--s3)' }}>
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Export Database Backup</h4>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Generate a complete package containing your user profile, trade setups, and daily notes.</p>
              </div>
              <button className="btn btn-primary" onClick={handleFullExport} disabled={exporting}>
                {exporting ? (
                  <>
                    <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating...
                  </>
                ) : (
                  <>
                    <Download size={13} /> Export Backup
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card: Import / Restore Database */}
          <div className="glass-deep" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-mid)' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s3)' }}>Restore Database</h4>
            
            {/* Drag & Drop File Zone */}
            {!backupFile && (
              <div
                className="upload-zone"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleBackupDrop}
                style={{
                  border: dragOver ? '1px dashed var(--accent)' : '1px dashed var(--border-mid)',
                  background: dragOver ? 'var(--accent-soft)' : 'var(--surface-glass)',
                  padding: 'var(--s6) var(--s4)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--s2)',
                  borderRadius: 'var(--r-md)',
                  cursor: 'pointer',
                  transition: 'all var(--t-mid)'
                }}
                onClick={() => document.getElementById('backup-file-input').click()}
              >
                <input
                  id="backup-file-input"
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={(e) => handleBackupFileSelect(e.target.files[0])}
                />
                <FileJson size={28} style={{ color: 'var(--accent)', opacity: 0.8 }} />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Drop JSON backup here or click to upload
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Only official trading journal JSON backups are supported
                  </div>
                </div>
              </div>
            )}

            {/* Parsing Errors */}
            {backupError && (
              <div style={{
                marginTop: 'var(--s3)',
                padding: 'var(--s2) var(--s3)',
                borderRadius: 'var(--r-sm)',
                background: 'var(--loss-soft)',
                border: '1px solid var(--loss-border)',
                fontSize: '0.72rem',
                color: 'var(--loss)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={14} />
                <span>{backupError}</span>
              </div>
            )}

            {/* Loaded Backup Preview Card */}
            {backupFile && (
              <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                <div style={{
                  padding: 'var(--s3)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--r-sm)',
                  fontSize: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileJson size={13} style={{ color: 'var(--accent)' }} /> {backupFile.name}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{backupFile.size}</span>
                  </div>
                  
                  {/* Backup Details Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s3)', margin: '8px 0' }}>
                    <div style={{ background: 'var(--surface-glass)', padding: '6px', borderRadius: 'var(--r-xs)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trades</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono' }}>{backupFile.tradesCount}</div>
                    </div>
                    <div style={{ background: 'var(--surface-glass)', padding: '6px', borderRadius: 'var(--r-xs)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Journals</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono' }}>{backupFile.journalEntriesCount}</div>
                    </div>
                    <div style={{ background: 'var(--surface-glass)', padding: '6px', borderRadius: 'var(--r-xs)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Profile Name</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', paddingTop: 2 }}>
                        {backupFile.user?.displayName || 'Trader'}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '4px' }}>
                    <span>Validation: <strong style={{ color: 'var(--profit)' }}>PASS ✓</strong></span>
                    <span>Version: {backupFile.rawData.version || '1.0'}</span>
                  </div>
                </div>

                {/* Import Strategy Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label" style={{ fontSize: '0.65rem' }}>Select Sync Strategy</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s2)' }}>
                    <div
                      onClick={() => setImportMode('merge')}
                      style={{
                        border: `1px solid ${importMode === 'merge' ? 'var(--accent)' : 'var(--border-mid)'}`,
                        background: importMode === 'merge' ? 'var(--accent-soft)' : 'transparent',
                        padding: '10px var(--s3)',
                        borderRadius: 'var(--r-sm)',
                        cursor: 'pointer',
                        transition: 'all var(--t-fast)'
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RefreshCw size={11} style={{ animation: importMode === 'merge' ? 'spin 6s linear infinite' : 'none' }} /> Merge Backup
                      </div>
                      <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                        Keep existing local records, ignore duplicate trades, and merge new data entries.
                      </p>
                    </div>

                    <div
                      onClick={() => setImportMode('overwrite')}
                      style={{
                        border: `1px solid ${importMode === 'overwrite' ? 'var(--loss)' : 'var(--border-mid)'}`,
                        background: importMode === 'overwrite' ? 'var(--loss-soft)' : 'transparent',
                        padding: '10px var(--s3)',
                        borderRadius: 'var(--r-sm)',
                        cursor: 'pointer',
                        transition: 'all var(--t-fast)'
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Trash2 size={11} style={{ color: importMode === 'overwrite' ? 'var(--loss)' : 'var(--text-tertiary)' }} /> Full Overwrite
                      </div>
                      <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                        Delete all current trades and daily notes, fully replacing the local database with backup.
                      </p>
                    </div>
                  </div>
                </div>

                {/* GitHub Danger Zone Box for Overwrites */}
                {importMode === 'overwrite' && (
                  <div className="anim-fade-in" style={{
                    border: '1px solid var(--loss-border)',
                    background: 'var(--loss-soft)',
                    borderRadius: 'var(--r-sm)',
                    padding: 'var(--s3)',
                    marginTop: '4px'
                  }}>
                    <div style={{ display: 'flex', gap: '8px', color: 'var(--loss)', fontSize: '0.72rem', fontWeight: 700, marginBottom: '6px' }}>
                      <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                      <span>CRITICAL: Destructive Database Overwrite Action</span>
                    </div>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: 'var(--s3)', lineHeight: 1.4 }}>
                      This will erase all trade statistics, analytics curves, and journal pages currently on this device. 
                      Please type <strong style={{ color: 'var(--loss)', fontFamily: 'JetBrains Mono' }}>RESTORE</strong> to confirm.
                    </p>
                    <input
                      className="input"
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        borderColor: 'var(--loss-border)',
                        color: 'var(--text-primary)',
                        fontFamily: 'JetBrains Mono',
                        height: 28
                      }}
                      placeholder="Type RESTORE to unlock"
                      value={overwriteConfirmText}
                      onChange={(e) => setOverwriteConfirmText(e.target.value)}
                    />
                  </div>
                )}

                {/* Confirm & Back Buttons */}
                <div style={{ display: 'flex', gap: 'var(--s2)', justifyContent: 'flex-end', marginTop: 'var(--s2)' }}>
                  <button className="btn btn-ghost btn-sm" onClick={clearBackupFile} disabled={importing}>
                    Cancel
                  </button>
                  <button
                    className={`btn btn-sm ${importMode === 'overwrite' ? 'btn-danger' : 'btn-primary'}`}
                    disabled={importing || (importMode === 'overwrite' && overwriteConfirmText !== 'RESTORE')}
                    onClick={handleConfirmRestore}
                  >
                    {importing ? (
                      <>
                        <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Restoring Database...
                      </>
                    ) : (
                      <>
                        Confirm {importMode === 'overwrite' ? 'Overwrite Restore' : 'Merge Restore'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Table: Operation History Log / Audit logs */}
          <div className="glass-deep" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-mid)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s3)' }}>
              <History size={12} style={{ color: 'var(--text-tertiary)' }} />
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Backup Operations Log</h4>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.68rem', fontFamily: 'JetBrains Mono' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-mid)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 4px', color: 'var(--text-muted)', fontWeight: 500 }}>Time</th>
                    <th style={{ padding: '6px 4px', color: 'var(--text-muted)', fontWeight: 500 }}>Action</th>
                    <th style={{ padding: '6px 4px', color: 'var(--text-muted)', fontWeight: 500 }}>Details</th>
                    <th style={{ padding: '6px 4px', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => {
                    const elapsed = Math.round((Date.now() - log.id) / 1000);
                    let relativeTime = 'Just now';
                    if (elapsed >= 60) {
                      const mins = Math.round(elapsed / 60);
                      if (mins >= 60) {
                        const hrs = Math.round(mins / 60);
                        relativeTime = `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
                      } else {
                        relativeTime = `${mins} min${mins > 1 ? 's' : ''} ago`;
                      }
                    } else if (elapsed > 5) {
                      relativeTime = `${elapsed}s ago`;
                    }
                    
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background var(--t-fast)' }}>
                        <td style={{ padding: '8px 4px', color: 'var(--text-muted)' }}>{relativeTime}</td>
                        <td style={{ padding: '8px 4px', fontWeight: 600, color: 'var(--text-secondary)' }}>{log.action}</td>
                        <td style={{ padding: '8px 4px', color: 'var(--text-tertiary)' }}>
                          {log.itemsText} {log.fileSize && `· ${log.fileSize}`}
                        </td>
                        <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                          <span className={log.status === 'success' ? 'badge badge-profit' : 'badge badge-loss'} style={{ fontSize: '0.55rem', padding: '1px 5px' }}>
                            {log.status === 'success' ? 'Success' : 'Failed'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: 'var(--s4) var(--s2)', fontStyle: 'italic', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No records in this session's database activity history logs.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;
