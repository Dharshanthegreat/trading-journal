import React, { useState, useEffect } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { useAuth } from '../contexts/AuthContext';
import { useJournal } from '../contexts/JournalContext';
import { backup as backupApi, accounts as accountsApi } from '../services/api';
import {
  Database, Download, RefreshCw, AlertTriangle, Loader,
  FileJson, Check, History, Trash2, Shield, RotateCcw, Wallet
} from 'lucide-react';

const Backup = () => {
  const { fetchTrades, fetchAnalytics } = useTrades();
  const { user, refreshUser } = useAuth();
  const { fetchEntries } = useJournal();
  
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
  const [savingLocal, setSavingLocal] = useState(false);
  const [localSaveResult, setLocalSaveResult] = useState(null);

  // Deleted Accounts State
  const [deletedAccounts, setDeletedAccounts] = useState([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);

  const fetchDeletedAccounts = async () => {
    try {
      setLoadingDeleted(true);
      const data = await accountsApi.getDeleted();
      setDeletedAccounts(data || []);
    } catch (err) {
      console.error('Failed to fetch deleted accounts:', err);
    } finally {
      setLoadingDeleted(false);
    }
  };

  useEffect(() => {
    fetchDeletedAccounts();
  }, []);

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

  const handleSaveLocal = async () => {
    if (user?.isGuest) { alert("Cannot trigger database sync in Showcase view."); return; }
    setSavingLocal(true);
    setLocalSaveResult(null);
    try {
      const res = await backupApi.saveLocal();
      setLocalSaveResult(res);
      addAuditLog('Server Sync', 'Success', 'success');
    } catch (err) {
      console.error('Server sync failed:', err);
      alert(err.message || 'Failed to sync data to server local file or Firebase Cloud Storage.');
      addAuditLog('Server Sync', 'Sync Failed', 'error');
    } finally {
      setSavingLocal(false);
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

  const handleRestoreAccount = async (id) => {
    if (user?.isGuest) { alert("Cannot modify accounts in Showcase view."); return; }
    try {
      await accountsApi.restore(id);
      addAuditLog('Restore Account', `Account ID: ${id}`, 'success');
      await fetchDeletedAccounts();
      // Optional: trigger account list refresh if we had a global context for it
    } catch (err) {
      console.error('Failed to restore account', err);
      alert('Failed to restore account');
    }
  };

  const handlePermanentDeleteAccount = async (id) => {
    if (user?.isGuest) { alert("Cannot modify accounts in Showcase view."); return; }
    if (!window.confirm('Are you sure you want to permanently delete this account? This action cannot be undone.')) return;
    try {
      await accountsApi.hardDelete(id);
      addAuditLog('Permanent Delete', `Account ID: ${id}`, 'success');
      await fetchDeletedAccounts();
    } catch (err) {
      console.error('Failed to permanently delete account', err);
      alert('Failed to permanently delete account');
    }
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', maxWidth: 900, paddingBottom: '60px' }}>
      <div className="page-header">
        <div className="page-title"><Database size={18} style={{ opacity: 0.6 }}/> Backup & Restore</div>
        <div className="page-subtitle">Manage your journal backups, export your data, or restore your database.</div>
      </div>

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
            <Check size={16} />
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

          {/* Card: Sync to Local & Cloud Storage */}
          <div className="glass-deep" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-mid)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--s3)' }}>
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Sync to Local File & Firebase Cloud Server</h4>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Save a full data backup directly to the host machine filesystem (`trading_journal_backup.json` in the root folder) and upload it to Firebase Cloud Storage.
                  </p>
                </div>
                <button className="btn btn-secondary" onClick={handleSaveLocal} disabled={savingLocal}>
                  {savingLocal ? (
                    <>
                      <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={13} /> Sync to Local & Firebase
                    </>
                  )}
                </button>
              </div>

              {localSaveResult && (
                <div className="glass" style={{
                  padding: 'var(--s3)',
                  borderRadius: 'var(--r-sm)',
                  border: '1px solid rgba(52, 211, 153, 0.2)',
                  background: 'rgba(52, 211, 153, 0.05)',
                  fontSize: '0.7rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  color: 'var(--text-secondary)',
                  textAlign: 'left'
                }}>
                  <div style={{ color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={12} /> Sync Complete!
                  </div>
                  {localSaveResult.localPath ? (
                    <div>📂 <strong>Local File Saved to:</strong> <code style={{ wordBreak: 'break-all', fontFamily: 'JetBrains Mono', color: 'var(--accent)' }}>{localSaveResult.localPath}</code></div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)' }}>⚠️ Local saving is disabled (running on remote cloud server).</div>
                  )}
                  {localSaveResult.firebaseUrl ? (
                    <div>🔥 <strong>Firebase Cloud URL:</strong> <a href={localSaveResult.firebaseUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#fbbf24', textDecoration: 'underline', wordBreak: 'break-all' }}>Download Cloud Backup</a></div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)' }}>⚠️ Firebase Cloud Storage backup is skipped (not configured/running locally).</div>
                  )}
                </div>
              )}
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
                <AlertTriangle size={14} />
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

          {/* Card: Account Backup (Recycle Bin) */}
          <div className="glass-deep" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-mid)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s3)' }}>
              <Wallet size={14} style={{ color: 'var(--text-tertiary)' }} />
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Account Backup (Recycle Bin)</h4>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 'var(--s4)' }}>
              Accounts you delete are stored here. You can restore them to recover their trades, or permanently delete them to free up space.
            </p>

            {loadingDeleted ? (
              <div style={{ padding: 'var(--s4)', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
              </div>
            ) : deletedAccounts.length === 0 ? (
              <div style={{ padding: 'var(--s4) var(--s2)', fontStyle: 'italic', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem', background: 'var(--surface-glass)', borderRadius: 'var(--r-sm)' }}>
                No deleted accounts found in the backup bin.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                {deletedAccounts.map(acc => (
                  <div key={acc.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--s3)',
                    padding: 'var(--s3)', background: 'var(--surface-glass)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{acc.accountName || acc.account_name}</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Balance: {acc.startingBalance || acc.balance} {acc.currency} • Type: {acc.accountType || acc.account_type}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--s2)' }}>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--profit)' }} onClick={() => handleRestoreAccount(acc.id)}>
                        <RotateCcw size={12} /> Restore
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--loss)' }} onClick={() => handlePermanentDeleteAccount(acc.id)}>
                        <Trash2 size={12} /> Delete Forever
                      </button>
                    </div>
                  </div>
                ))}
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

export default Backup;
